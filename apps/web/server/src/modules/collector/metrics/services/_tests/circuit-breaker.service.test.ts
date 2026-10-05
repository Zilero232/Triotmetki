import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../../core';

import { CIRCUIT_BREAKER } from '../../config/circuit-breaker.constants';
import { CircuitBreakerService } from '../circuit-breaker.service';

const burst = CIRCUIT_BREAKER.minimumRps * (CIRCUIT_BREAKER.samplingMs / 1000) + 5;

const createBreaker = () => {
  const prisma = mockDeep<PrismaService>();

  return { prisma, breaker: new CircuitBreakerService(prisma) };
};

const fail = async (breaker: CircuitBreakerService) => {
  for (let index = 0; index < burst; index += 1) {
    breaker.record(false);
  }

  await vi.waitFor(() => expect(breaker.isOpen()).toBe(true));
};

describe('CircuitBreakerService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays closed while Lesta answers', async () => {
    const { breaker } = createBreaker();

    for (let index = 0; index < burst; index += 1) {
      breaker.record(true);
    }

    await Promise.resolve();

    expect(breaker.isOpen()).toBe(false);
  });

  it('opens on a burst of failures, tells listeners and persists the state', async () => {
    const { prisma, breaker } = createBreaker();
    const listener = vi.fn();

    breaker.onChange(listener);
    await fail(breaker);

    expect(listener).toHaveBeenCalledWith('open');
    expect(prisma.collectorState.upsert).toHaveBeenCalled();
  });

  it('lets probes through once the cool-down has passed', async () => {
    const { breaker } = createBreaker();

    await fail(breaker);

    vi.useFakeTimers({ now: Date.now() + CIRCUIT_BREAKER.halfOpenAfterMs + 1 });

    expect(breaker.isOpen()).toBe(false);
  });
});
