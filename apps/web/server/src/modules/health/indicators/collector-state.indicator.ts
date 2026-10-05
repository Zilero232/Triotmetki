import type { HealthIndicatorResult } from '@nestjs/terminus';

import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { differenceInMilliseconds } from 'date-fns';

import { AppConfigService } from '../../../config';
import { PrismaService } from '../../../core';
import { COLLECTOR_STATE_KEY } from '../../collector';
import { HEALTH } from '../config/health.constants';
import { circuitSchema, heartbeatSchema } from '../dto/health.schemas';

@Injectable()
export class CollectorStateIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicators: HealthIndicatorService,
    private readonly config: AppConfigService
  ) {}

  async worker(): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(HEALTH.key.worker);
    const heartbeat = heartbeatSchema.safeParse(await this.state(COLLECTOR_STATE_KEY.queues));

    if (!heartbeat.success) {
      return indicator.degraded({ state: 'unknown' });
    }

    const fresh = differenceInMilliseconds(new Date(), new Date(heartbeat.data.collectedAt)) < HEALTH.workerStaleMs;

    const mode = this.hasLesta() ? {} : { mode: HEALTH.lestaOff.worker };

    return fresh
      ? indicator.up({ state: 'ok', ...mode, collectedAt: heartbeat.data.collectedAt })
      : indicator.degraded({ state: 'stale', collectedAt: heartbeat.data.collectedAt });
  }

  async lestaCircuit(): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(HEALTH.key.lestaCircuit);

    if (!this.hasLesta()) {
      return indicator.degraded({ state: HEALTH.lestaOff.circuit });
    }

    const circuit = circuitSchema.safeParse(await this.state(COLLECTOR_STATE_KEY.circuitBreaker));

    if (!circuit.success) {
      return indicator.degraded({ state: 'unknown' });
    }

    return circuit.data.state === 'closed' ? indicator.up({ state: circuit.data.state }) : indicator.degraded({ state: circuit.data.state });
  }

  private hasLesta(): boolean {
    return this.config.get('LESTA_APPLICATION_ID') !== '';
  }

  private async state(key: string): Promise<unknown> {
    const row = await this.prisma.collectorState.findUnique({ where: { key }, select: { value: true } }).catch(() => null);

    return row?.value;
  }
}
