import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { PulseQueries } from '../../queries/pulse.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { PULSE } from '../../config/pulse.constants';
import { encodeSample } from '../../lib/pulse-grid/pulse-grid';
import { PulseReaderService } from '../pulse-reader.service';

const now = new Date('2026-09-25T12:00:00Z');

const dayMs = 86_400_000;

const createService = async () => {
  const prisma = mockPrismaService();
  const queries = mock<PulseQueries>();
  const redis = new RedisMock();

  await redis.del(PULSE.cacheKey, PULSE.samplesKey);
  queries.activityByHour.mockResolvedValue([{ weekday: 4, hour: 20, players: 12 }]);
  prisma.player.count.mockResolvedValue(40);

  return { service: new PulseReaderService(prisma, redis, queries), prisma, queries, redis };
};

describe('PulseReaderService.view', () => {
  it('computes the view once and serves the cached copy without touching the database', async () => {
    const { service, prisma, redis } = await createService();

    const computed = await service.view(now);
    const fresh = mockPrismaService();
    const freshQueries = mock<PulseQueries>();
    const cached = await new PulseReaderService(fresh, redis, freshQueries).view(new Date(now.getTime() + 60_000));

    expect(cached).toEqual(computed);
    expect(prisma.player.count).toHaveBeenCalled();
    expect(freshQueries.activityByHour).not.toHaveBeenCalled();
    expect(fresh.player.count).not.toHaveBeenCalled();
    expect(await redis.ttl(PULSE.cacheKey)).toBeGreaterThan(PULSE.cacheSeconds - 5);
  });

  it('recomputes when the cached value does not match the schema', async () => {
    const { service, queries, redis } = await createService();

    await redis.set(PULSE.cacheKey, JSON.stringify({ stale: true }));

    const view = await service.view(now);

    expect(queries.activityByHour).toHaveBeenCalledTimes(1);
    expect(view.computedAt).toBe(now.toISOString());
    expect(view.bestHours[0]?.hour).toBe(20);
  });

  it('charts only the samples inside the series window', async () => {
    const { service, redis } = await createService();
    const inside = new Date(now.getTime() - (PULSE.seriesDays - 1) * dayMs);
    const outside = new Date(now.getTime() - (PULSE.seriesDays + 1) * dayMs);

    await redis.zadd(PULSE.samplesKey, outside.getTime(), encodeSample({ at: outside, players: 1 }));
    await redis.zadd(PULSE.samplesKey, inside.getTime(), encodeSample({ at: inside, players: 2 }));

    const view = await service.view(now);

    expect(view.series).toEqual([{ at: inside.toISOString(), players: 2 }]);
  });
});
