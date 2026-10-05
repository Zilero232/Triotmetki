import type { ChainableCommander, Redis } from 'ioredis';

import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { PULSE } from '../../config/pulse.constants';
import { decodeSample, encodeSample } from '../../lib/pulse-grid/pulse-grid';
import { PulseAggregateService } from '../pulse-aggregate.service';

const now = new Date('2026-09-25T12:00:00Z');

const EXEC_FAILURES: [string, [Error | null, unknown][] | null][] = [
  [
    'rejects one of its commands',
    [
      [new Error('WRONGTYPE'), null],
      [null, 0]
    ]
  ],
  ['is aborted', null]
];

const dayMs = 86_400_000;

const createService = async () => {
  const prisma = mockPrismaService();
  const redis = new RedisMock();

  await redis.del(PULSE.cacheKey, PULSE.samplesKey);
  prisma.player.count.mockResolvedValue(40);

  return { service: new PulseAggregateService(prisma, redis), redis };
};

describe('PulseAggregateService.sample', () => {
  it('stores the current active count and drops samples past the retention', async () => {
    const { service, redis } = await createService();
    const expired = new Date(now.getTime() - (PULSE.retentionDays + 1) * dayMs);
    const kept = new Date(now.getTime() - (PULSE.retentionDays - 1) * dayMs);

    await redis.zadd(PULSE.samplesKey, expired.getTime(), encodeSample({ at: expired, players: 5 }));
    await redis.zadd(PULSE.samplesKey, kept.getTime(), encodeSample({ at: kept, players: 6 }));

    expect(await service.sample(now)).toBe(40);

    const stored = (await redis.zrange(PULSE.samplesKey, 0, -1)).map((member) => decodeSample(member));

    expect(stored).toEqual([
      { at: kept, players: 6 },
      { at: now, players: 40 }
    ]);
  });

  it.each(EXEC_FAILURES)('fails loudly when the sample transaction %s', async (_, results) => {
    const prisma = mockPrismaService();
    const redis = mock<Redis>();
    const chain = mock<ChainableCommander>();

    prisma.player.count.mockResolvedValue(40);
    chain.zadd.mockReturnValue(chain);
    chain.zremrangebyscore.mockReturnValue(chain);
    chain.exec.mockResolvedValue(results);
    redis.multi.mockReturnValue(chain);

    await expect(new PulseAggregateService(prisma, redis).sample(now)).rejects.toThrow();
  });
});
