import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { circuitBreaker, CircuitState, handleAll, SamplingBreaker } from 'cockatiel';

import type { CircuitListener, CircuitStateName } from '../metrics.types';

import { errorMessage } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { COLLECTOR_STATE_KEY } from '../../config';
import { CIRCUIT_BREAKER, CIRCUIT_STATE_NAME } from '../config/circuit-breaker.constants';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly listeners = new Set<CircuitListener>();
  private readonly policy = circuitBreaker(handleAll, {
    halfOpenAfter: CIRCUIT_BREAKER.halfOpenAfterMs,
    breaker: new SamplingBreaker({
      threshold: CIRCUIT_BREAKER.threshold,
      duration: CIRCUIT_BREAKER.samplingMs,
      minimumRps: CIRCUIT_BREAKER.minimumRps
    })
  });

  private openedAt: number | null = null;
  private lastState: CircuitStateName = CIRCUIT_STATE_NAME.closed;

  constructor(private readonly prisma: PrismaService) {
    this.policy.onBreak(() => {
      this.openedAt = Date.now();
    });

    this.policy.onStateChange(() => this.emit());
  }

  record(ok: boolean) {
    void this.policy
      .execute(() => {
        if (!ok) {
          throw new Error('Lesta degraded');
        }
      })
      .catch(() => undefined);
  }

  isOpen(): boolean {
    return this.state() === CIRCUIT_STATE_NAME.open;
  }

  onChange(listener: CircuitListener): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  @Interval(CIRCUIT_BREAKER.tickMs)
  tick() {
    this.emit();
  }

  private state(): CircuitStateName {
    const { state } = this.policy;

    if (state === CircuitState.Closed) {
      return CIRCUIT_STATE_NAME.closed;
    }

    const coolingDown = this.openedAt !== null && Date.now() - this.openedAt < CIRCUIT_BREAKER.halfOpenAfterMs;

    return state === CircuitState.Open && coolingDown ? CIRCUIT_STATE_NAME.open : CIRCUIT_STATE_NAME.halfOpen;
  }

  private emit() {
    const state = this.state();

    if (state === this.lastState) {
      return;
    }

    this.lastState = state;
    this.logger.warn(`Lesta circuit ${state}`);

    for (const listener of this.listeners) {
      listener(state);
    }

    const value = { state, changedAt: new Date().toISOString() };

    this.prisma.collectorState
      .upsert({ where: { key: COLLECTOR_STATE_KEY.circuitBreaker }, create: { key: COLLECTOR_STATE_KEY.circuitBreaker, value }, update: { value } })
      .catch((error: unknown) => this.logger.warn(`circuit state not persisted: ${errorMessage(error)}`));
  }
}
