import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Battle } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { ANALYTICS_WINDOW } from '../../config/window.constants';
import { HonestRngReaderService } from '../honest-rng-reader.service';
import { OwnAccountReaderService } from '../own-account-reader.service';

const now = new Date('2026-09-26T10:00:00Z');

const shot = { damage: 400, nominal: 390, shell: 'armor_piercing', outcome: 'damage', distance: 150, fatal: false };

const battle = (fields: Pick<Battle, 'shots' | 'shotsFired' | 'shotsHit' | 'shotsPierced'>) => Object.assign(mock<Battle>(), fields);

const setup = () => {
  const prisma = mockDeep<PrismaService>();
  const accounts = mock<OwnAccountReaderService>();

  accounts.resolve.mockResolvedValue(7n);
  prisma.battle.findMany.mockResolvedValue([]);
  prisma.battle.count.mockResolvedValue(0);

  return { prisma, accounts, service: new HonestRngReaderService(prisma, accounts) };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('HonestRngReaderService.rng', () => {
  it('reports no rates when no battles were recorded', async () => {
    const { service } = setup();

    const rng = await service.rng({ userId: 'u', period: 'd30' });

    expect(rng).toMatchObject({ battles: 0, shots: 0, meanRoll: null, accuracy: { shotsFired: 0, hitRate: null, penRate: null } });
  });

  it('computes pen rate against hits, not against shots fired', async () => {
    const { prisma, service } = setup();

    prisma.battle.findMany.mockResolvedValue([
      battle({ shots: [], shotsFired: 10, shotsHit: 8, shotsPierced: 4 }),
      battle({ shots: [], shotsFired: 10, shotsHit: 2, shotsPierced: 1 })
    ]);

    const { accuracy } = await service.rng({ userId: 'u', period: 'd30' });

    expect(accuracy.shotsFired).toBe(20);
    expect(accuracy.hitRate).toBe(50);
    expect(accuracy.penRate).toBe(50);
  });

  it('treats missing shot counters as zero', async () => {
    const { prisma, service } = setup();

    prisma.battle.findMany.mockResolvedValue([
      battle({ shots: null, shotsFired: null, shotsHit: null, shotsPierced: null }),
      battle({ shots: null, shotsFired: 4, shotsHit: 2, shotsPierced: null })
    ]);

    prisma.battle.count.mockResolvedValue(2);

    const rng = await service.rng({ userId: 'u', period: 'd30' });

    expect(rng.battles).toBe(2);
    expect(rng.accuracy).toEqual({ shotsFired: 4, hitRate: 50, penRate: 0 });
  });

  it('summarises the damage rolls stored with each battle and skips unreadable ones', async () => {
    const { prisma, service } = setup();

    prisma.battle.findMany.mockResolvedValue([
      battle({ shots: [shot, shot], shotsFired: 2, shotsHit: 2, shotsPierced: 2 }),
      battle({ shots: 'broken', shotsFired: 1, shotsHit: 1, shotsPierced: 1 })
    ]);

    const rng = await service.rng({ userId: 'u', period: 'd30' });

    expect(rng.shots).toBe(2);
    expect(rng.meanRoll).toBeGreaterThan(0);
  });

  it('reads every battle for the all-time period', async () => {
    const { prisma, service } = setup();

    await service.rng({ userId: 'u', period: 'all' });

    expect(prisma.battle.findMany.mock.calls[0]?.[0]?.where).not.toHaveProperty('startedAt');
  });

  it('starts a shorter period later than a longer one, and both before now', async () => {
    const { prisma, service } = setup();

    await service.rng({ userId: 'u', period: 'd30' });
    await service.rng({ userId: 'u', period: 'd90' });

    const [short, long] = prisma.battle.findMany.mock.calls.map(([args]) => args?.where?.startedAt);
    const from = (filter: unknown) => (filter instanceof Object && 'gte' in filter && filter.gte instanceof Date ? filter.gte.getTime() : Number.NaN);

    expect(from(long)).toBeLessThan(from(short));
    expect(from(short)).toBeLessThan(now.getTime());
  });
});

describe('HonestRngReaderService.rng bounds', () => {
  it('reads the rolls of the most recent battles only, but counts every battle of the period', async () => {
    const { prisma, service } = setup();

    prisma.battle.count.mockResolvedValue(ANALYTICS_WINDOW.rngMaxBattles * 2);

    const rng = await service.rng({ userId: 'u', period: 'all' });

    expect(rng.battles).toBe(ANALYTICS_WINDOW.rngMaxBattles * 2);
    expect(prisma.battle.findMany.mock.calls[0]?.[0]).toMatchObject({ orderBy: { startedAt: 'desc' }, take: ANALYTICS_WINDOW.rngMaxBattles });
  });
});
