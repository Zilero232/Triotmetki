import { sortBy } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { LestaClients } from '../../../../core';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { AchievementsSyncService } from '../achievements-sync.service';

const NOW = new Date('2026-10-05T12:00:00Z');
const STALE = new Date('2026-09-01T12:00:00Z');
const FRESH = new Date('2026-10-04T12:00:00Z');

type LestaAchievements = Awaited<ReturnType<LestaClients['bulk']['account']['achievements']>>;

const ACCOUNT = { refreshed: 4001n, added: 4002n, absent: 4003n, missing: 4004n, fresh: 4005n } as const;

describeWithDatabase('AchievementsSyncService.fetch', () => {
  const prisma = createTestPrisma();

  const createSync = (response: LestaAchievements) => {
    const clients = mockDeep<LestaClients>();

    clients.bulk.account.achievements.mockResolvedValue(response);

    return { clients, sync: new AchievementsSyncService(prisma, clients) };
  };

  const stored = async () =>
    sortBy(
      (await prisma.accountAchievements.findMany({ select: { accountId: true, counts: true, maxSeries: true, fetchedAt: true } })).map((row) => ({
        ...row,
        accountId: Number(row.accountId)
      })),
      (row) => row.accountId
    );

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['account_achievements', 'data_deletion_request', 'player'] });

    await prisma.player.createMany({
      data: Object.values(ACCOUNT).map((accountId) => ({ accountId, nickname: `player-${accountId}` }))
    });

    await prisma.accountAchievements.createMany({
      data: [
        { accountId: ACCOUNT.refreshed, counts: { old: 1 }, maxSeries: { sniper: 1 }, fetchedAt: STALE },
        { accountId: ACCOUNT.fresh, counts: { kept: 1 }, fetchedAt: FRESH }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns nothing to do when no account is due', async () => {
    await prisma.accountAchievements.updateMany({ data: { fetchedAt: FRESH } });

    await prisma.accountAchievements.createMany({
      data: [ACCOUNT.added, ACCOUNT.absent, ACCOUNT.missing].map((accountId) => ({ accountId, counts: {}, fetchedAt: FRESH }))
    });

    const { sync, clients } = createSync({});

    expect(await sync.fetch(NOW)).toEqual({ requested: 0, stored: 0 });
    expect(clients.bulk.account.achievements).not.toHaveBeenCalled();
  });

  it('requests every due account from Lesta, never-fetched ones first', async () => {
    const { sync, clients } = createSync({});

    await sync.fetch(NOW);

    expect(clients.bulk.account.achievements.mock.calls[0]?.[0].accountIds).toEqual([
      String(ACCOUNT.added),
      String(ACCOUNT.absent),
      String(ACCOUNT.missing),
      String(ACCOUNT.refreshed)
    ]);
  });

  it('stores the accounts Lesta answered for and counts the rest as requested only', async () => {
    const { sync } = createSync({
      [String(ACCOUNT.refreshed)]: { achievements: { warrior: 3 }, max_series: { sniper: 4 } },
      [String(ACCOUNT.added)]: { achievements: { medal: 1 } },
      [String(ACCOUNT.missing)]: null
    });

    expect(await sync.fetch(NOW)).toEqual({ requested: 4, stored: 2 });

    expect(await stored()).toEqual([
      { accountId: Number(ACCOUNT.refreshed), counts: { warrior: 3 }, maxSeries: { sniper: 4 }, fetchedAt: NOW },
      { accountId: Number(ACCOUNT.added), counts: { medal: 1 }, maxSeries: null, fetchedAt: NOW },
      { accountId: Number(ACCOUNT.fresh), counts: { kept: 1 }, maxSeries: null, fetchedAt: FRESH }
    ]);
  });
});
