import { subDays } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { TanksQueries } from '../../providers/tanks-queries.provider.types';

import { moscowDayStart } from '../../../../common/lib';
import { TIMESCALE } from '../../../../config';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { TankTrendReaderService } from '../tank-trend-reader.service';

const createService = () => {
  const queries = mock<TanksQueries>();

  queries.tankTrendRows.mockResolvedValue([]);

  return { service: new TankTrendReaderService(mockPrismaService(), queries), queries };
};

const windowOf = (queries: ReturnType<typeof createService>['queries']) => {
  const [input] = queries.tankTrendRows.mock.calls[0] ?? [];

  return { from: input?.from, recent: input?.recent, recentDay: input?.recentDay };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-26T12:30:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TankTrendReaderService.trend', () => {
  it('counts today as the last day of the window, starting at Moscow midnight', async () => {
    const { service, queries } = createService();

    await service.trend({ tankId: 1, query: { days: 7, mode: 'random' } });

    expect(windowOf(queries).from).toEqual(new Date('2026-09-19T21:00:00Z'));
  });

  it('counts players only over the days whose deltas are not compressed yet', async () => {
    const { service, queries } = createService();

    await service.trend({ tankId: 1, query: { days: 60, mode: 'random' } });

    expect(windowOf(queries).recent).toEqual(moscowDayStart(subDays(new Date(), TIMESCALE.compressAfterDays - 1)));
  });

  it('counts players over the whole window when it is shorter than the uncompressed span', async () => {
    const { service, queries } = createService();

    await service.trend({ tankId: 1, query: { days: 7, mode: 'random' } });

    expect(windowOf(queries).recent).toEqual(windowOf(queries).from);
  });

  it('names the first uncompressed Moscow day', async () => {
    const { service, queries } = createService();

    await service.trend({ tankId: 1, query: { days: 60, mode: 'random' } });

    expect(windowOf(queries).recentDay).toBe('2026-09-13');
  });

  it('turns the daily rows into points', async () => {
    const { service, queries } = createService();

    queries.tankTrendRows.mockResolvedValue([{ day: '2026-09-25', battles: 10, wins: 6, damage: 20_000, players: 4 }]);

    const trend = await service.trend({ tankId: 1, query: { days: 7, mode: 'random' } });

    expect(trend).toMatchObject({ tankId: 1, mode: 'random', days: 7 });
    expect(trend.points).toEqual([{ date: '2026-09-25', battles: 10, players: 4, winRate: 60, avgDamage: 2_000 }]);
  });
});
