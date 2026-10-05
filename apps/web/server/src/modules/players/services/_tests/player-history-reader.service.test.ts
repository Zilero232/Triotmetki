import { timeSeriesQuerySchema } from '@otmetki/schemas';
import { differenceInCalendarDays, subDays } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Clan, GameVersion, PlayerClanHistory, PlayerNickname, UserLestaAccount } from '../../../../../generated';
import type { EntitlementsService } from '../../../billing';
import type { BronyaReferencesReaderService, ExpectedValuesReaderService, VehicleCatalogService } from '../../../reference';
import type { PlayerQueries } from '../../providers/player-queries.provider.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { HISTORY_WINDOW } from '../../config';
import { PlayerHistoryReaderService } from '../player-history-reader.service';

const NOW = new Date('2026-09-26T12:00:00.000Z');

const createService = () => {
  const prisma = mockPrismaService();
  const queries = mock<PlayerQueries>();
  const catalog = mock<VehicleCatalogService>();
  const expected = mock<ExpectedValuesReaderService>();
  const bronya = mock<BronyaReferencesReaderService>();
  const entitlements = mock<EntitlementsService>();

  queries.tankDeltaBuckets.mockResolvedValue([]);
  queries.activityDays.mockResolvedValue([]);
  prisma.gameVersion.findMany.mockResolvedValue([]);
  expected.all.mockResolvedValue(new Map());
  catalog.tiers.mockResolvedValue(new Map());
  bronya.all.mockResolvedValue(new Map());

  return { service: new PlayerHistoryReaderService(prisma, catalog, expected, bronya, entitlements, queries), prisma, queries, bronya, entitlements };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PlayerHistoryReaderService.policyFor', () => {
  it('gives an anonymous viewer the free window', async () => {
    const { service, prisma } = createService();

    await expect(service.policyFor({ accountId: 42n, viewerUserId: null })).resolves.toEqual(HISTORY_WINDOW.free);
    expect(prisma.userLestaAccount.findUnique).not.toHaveBeenCalled();
  });

  it('gives the full window only to the Plus owner of the account', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.userLestaAccount.findUnique.mockResolvedValue(mock<UserLestaAccount>({ userId: 'owner' }));
    entitlements.isPlus.mockResolvedValue(true);

    await expect(service.policyFor({ accountId: 42n, viewerUserId: 'owner' })).resolves.toEqual(HISTORY_WINDOW.full);
  });

  it('keeps a Plus viewer of someone else’s account on the free window', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.userLestaAccount.findUnique.mockResolvedValue(mock<UserLestaAccount>({ userId: 'owner' }));
    entitlements.isPlus.mockResolvedValue(true);

    await expect(service.policyFor({ accountId: 42n, viewerUserId: 'stranger' })).resolves.toEqual(HISTORY_WINDOW.free);
  });

  it('keeps a free owner on the free window', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.userLestaAccount.findUnique.mockResolvedValue(mock<UserLestaAccount>({ userId: 'owner' }));
    entitlements.isPlus.mockResolvedValue(false);

    await expect(service.policyFor({ accountId: 42n, viewerUserId: 'owner' })).resolves.toEqual(HISTORY_WINDOW.free);
  });

  it('keeps an unlinked account on the free window', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findUnique.mockResolvedValue(null);

    await expect(service.policyFor({ accountId: 42n, viewerUserId: 'owner' })).resolves.toEqual(HISTORY_WINDOW.free);
  });
});

describe('PlayerHistoryReaderService.series', () => {
  it('marks released patches and skips unreleased ones', async () => {
    const { service, prisma } = createService();
    const releasedAt = new Date('2026-09-20T00:00:00.000Z');

    prisma.gameVersion.findMany.mockResolvedValue([
      mock<GameVersion>({ version: '1.30', title: null, releasedAt }),
      mock<GameVersion>({ version: '1.31', title: 'Autumn', releasedAt: null })
    ]);

    const series = await service.series({ accountId: 42n, query: timeSeriesQuerySchema.parse({ metric: 'battles' }), policy: HISTORY_WINDOW.free });

    expect(series.markers).toEqual([{ at: releasedAt.toISOString(), kind: 'patch', label: '1.30' }]);
  });

  it('loads Bronya references only for the Bronya index', async () => {
    const { service, bronya } = createService();

    await service.series({ accountId: 42n, query: timeSeriesQuerySchema.parse({ metric: 'wn8' }), policy: HISTORY_WINDOW.free });
    expect(bronya.all).not.toHaveBeenCalled();

    await service.series({ accountId: 42n, query: timeSeriesQuerySchema.parse({ metric: 'broneIndex' }), policy: HISTORY_WINDOW.free });
    expect(bronya.all).toHaveBeenCalledOnce();
  });

  it('clamps a requested start to the policy limit', async () => {
    const { service, prisma } = createService();

    await service.series({
      accountId: 42n,
      query: timeSeriesQuerySchema.parse({ metric: 'battles', from: '2020-01-01T00:00:00.000Z' }),
      policy: HISTORY_WINDOW.free
    });

    expect(prisma.gameVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { releasedAt: { gte: subDays(NOW, HISTORY_WINDOW.free.limitDays), lt: NOW } } })
    );
  });
});

describe('PlayerHistoryReaderService.activity', () => {
  it('spans the requested number of Moscow days and computes the daily win rate', async () => {
    const { service, queries } = createService();

    queries.activityDays.mockResolvedValue([
      { day: '2026-09-25', battles: 10, wins: 6 },
      { day: '2026-09-26', battles: 0, wins: 0 }
    ]);

    const activity = await service.activity({ accountId: 42n, days: 7 });

    expect(differenceInCalendarDays(new Date(activity.to), new Date(activity.from))).toBe(6);
    expect(activity.days.map((day) => day.winRate)).toEqual([60, null]);
  });
});

describe('PlayerHistoryReaderService.nicknames', () => {
  it('merges nicknames and clans newest first and falls back to the clan id without a tag', async () => {
    const { service, prisma } = createService();

    prisma.playerNickname.findMany.mockResolvedValue([
      mock<PlayerNickname>({ nickname: 'Old', firstSeenAt: new Date('2025-01-01T00:00:00.000Z'), lastSeenAt: new Date('2025-06-01T00:00:00.000Z') })
    ]);

    prisma.playerClanHistory.findMany.mockResolvedValue([
      mock<PlayerClanHistory>({ clanId: 7n, joinedAt: new Date('2026-01-01T00:00:00.000Z'), leftAt: null }),
      mock<PlayerClanHistory>({ clanId: 8n, joinedAt: new Date('2025-03-01T00:00:00.000Z'), leftAt: null })
    ]);

    prisma.clan.findMany.mockResolvedValue([mock<Clan>({ clanId: 7n, tag: 'TAG' })]);

    const entries = await service.nicknames(42n);

    expect(entries.map((entry) => entry.value)).toEqual(['TAG', '8', 'Old']);
    expect(entries[0]).toMatchObject({ kind: 'clan', to: null });
  });
});
