import { subDays } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';

import { moscowDayStart } from '../../../../common/lib';
import { TIMESCALE } from '../../../../config';
import { TankTrendService } from '../tank-trend.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.$queryRaw.mockResolvedValue([]);

  return { service: new TankTrendService(prisma), prisma };
};

const windowDates = (prisma: ReturnType<typeof createService>['prisma']) =>
  prisma.$queryRaw.mock.calls[0]?.slice(1).filter((value) => value instanceof Date) ?? [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-26T12:30:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TankTrendService.trend', () => {
  it('counts today as the last day of the window, starting at Moscow midnight', async () => {
    const { service, prisma } = createService();

    await service.trend({ tankId: 1, query: { days: 7, mode: 'random' } });

    expect(windowDates(prisma)[0]).toEqual(new Date('2026-09-19T21:00:00Z'));
  });

  it('counts players only over the days whose deltas are not compressed yet', async () => {
    const { service, prisma } = createService();

    await service.trend({ tankId: 1, query: { days: 60, mode: 'random' } });

    expect(windowDates(prisma)[1]).toEqual(moscowDayStart(subDays(new Date(), TIMESCALE.compressAfterDays - 1)));
  });

  it('counts players over the whole window when it is shorter than the uncompressed span', async () => {
    const { service, prisma } = createService();

    await service.trend({ tankId: 1, query: { days: 7, mode: 'random' } });

    expect(windowDates(prisma)[1]).toEqual(windowDates(prisma)[0]);
  });

  it('leaves the players of the compressed days unknown rather than zero', async () => {
    const { service, prisma } = createService();

    await service.trend({ tankId: 1, query: { days: 60, mode: 'random' } });

    const [query] = prisma.$queryRaw.mock.calls[0] ?? [];
    const sql = query && 'raw' in query ? query.join('?') : '';

    expect(sql).toMatch(/CASE WHEN sums\.day >= \? THEN coalesce\(players\.players, 0\) END AS players/);
    expect(prisma.$queryRaw.mock.calls[0]).toContain('2026-09-13');
  });

  it('turns the daily rows into points', async () => {
    const { service, prisma } = createService();

    prisma.$queryRaw.mockResolvedValue([{ day: '2026-09-25', battles: 10, wins: 6, damage: 20_000, players: 4 }]);

    const trend = await service.trend({ tankId: 1, query: { days: 7, mode: 'random' } });

    expect(trend).toMatchObject({ tankId: 1, mode: 'random', days: 7 });
    expect(trend.points).toEqual([{ date: '2026-09-25', battles: 10, players: 4, winRate: 60, avgDamage: 2_000 }]);
  });
});
