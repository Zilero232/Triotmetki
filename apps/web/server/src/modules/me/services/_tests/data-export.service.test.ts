import { subDays } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountSnapshot, Player, PlayerTank, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { UserAccountsReaderService } from '../../../accounts';
import { ModSyncService } from '../../../mod-sync';
import { DATA_EXPORT } from '../../config';
import { DataExportService } from '../data-export.service';

const NOW = new Date('2026-09-26T12:00:00.000Z');

const player = (accountId: bigint): Player => mock<Player>({ accountId, nickname: `p${accountId}`, createdAt: null, lastBattleAt: null });

const createService = (linked: bigint[]) => {
  const prisma = mockDeep<PrismaService>();

  prisma.userLestaAccount.findMany.mockResolvedValue(linked.map((accountId) => mock<UserLestaAccount>({ accountId })));
  prisma.player.findMany.mockResolvedValue(linked.map(player));
  prisma.playerTank.findMany.mockResolvedValue([]);
  prisma.accountSnapshot.findFirst.mockResolvedValue(null);
  prisma.playSession.findMany.mockResolvedValue([]);
  prisma.battle.findMany.mockResolvedValue([]);

  return { service: new DataExportService(prisma, new UserAccountsReaderService(prisma), new ModSyncService(prisma)), prisma };
};

const accountFilter = { accountId: { in: [7n, 8n] } };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DataExportService.raw', () => {
  it('reads only the accounts linked to the requesting user', async () => {
    const { service, prisma } = createService([7n, 8n]);

    await service.raw('user');

    expect(prisma.userLestaAccount.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user' } }));
    expect(prisma.player.findMany.mock.calls[0]?.[0]?.where).toEqual(accountFilter);
    expect(prisma.playerTank.findMany.mock.calls[0]?.[0]?.where).toEqual(accountFilter);
    expect(prisma.accountSnapshot.findFirst.mock.calls.map(([query]) => query?.where?.accountId)).toEqual([7n, 8n]);
  });

  it('includes the component sets and profiles the user synced from the modpack', async () => {
    const { service, prisma } = createService([7n]);

    prisma.modSyncLibrary.findUnique.mockResolvedValue(null);

    const result = await service.raw('user');

    expect(prisma.modSyncLibrary.findUnique.mock.calls.map(([query]) => query.where)).toEqual([
      { userId_kind: { userId: 'user', kind: 'sets' } },
      { userId_kind: { userId: 'user', kind: 'profiles' } }
    ]);

    expect(result.modSync).toEqual({
      sets: { sets: [], deleted: [], revision: 0, updated_at: null },
      profiles: { profiles: [], deleted: [], revision: 0, updated_at: null }
    });
  });

  it('exports an account without a snapshot with empty overall stats', async () => {
    const { service, prisma } = createService([7n, 8n]);

    prisma.accountSnapshot.findFirst.mockResolvedValueOnce(
      mock<AccountSnapshot>({
        accountId: 7n,
        capturedAt: NOW,
        damageDealt: 10n,
        damageReceived: 5n,
        xp: 3n,
        battles: 1,
        wins: 1,
        losses: 0,
        draws: 0,
        frags: 0,
        spotted: 0,
        survived: 1,
        hits: 0,
        shots: 0,
        capturePoints: 0,
        droppedCapturePoints: 0,
        globalRating: null
      })
    );

    const { accounts, generatedAt } = await service.raw('user');

    expect(generatedAt).toBe(NOW.toISOString());
    expect(accounts.map((account) => account.overall?.damageDealt ?? null)).toEqual([10, null]);
  });

  it('exports nothing for a user without linked accounts', async () => {
    const { service } = createService([]);

    await expect(service.raw('user')).resolves.toMatchObject({ accounts: [], tanks: [] });
  });
});

describe('DataExportService.analytics', () => {
  it('limits sessions to the export window and battles to the export cap of the user’s accounts', async () => {
    const { service, prisma } = createService([7n, 8n]);

    await service.analytics('user');

    expect(prisma.playSession.findMany.mock.calls[0]?.[0]?.where).toEqual({
      ...accountFilter,
      startedAt: { gte: subDays(NOW, DATA_EXPORT.sessionDays) }
    });

    expect(prisma.battle.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: accountFilter, take: DATA_EXPORT.maxBattles }));
  });

  it('derives the tank level from its progression XP', async () => {
    const { service, prisma } = createService([7n]);

    prisma.playerTank.findMany.mockResolvedValue([
      mock<PlayerTank>({ accountId: 7n, tankId: 1, progressXp: 0, progressBattles: 0 }),
      mock<PlayerTank>({ accountId: 7n, tankId: 2, progressXp: 1_000_000, progressBattles: 500 })
    ]);

    const { tankProgress } = await service.analytics('user');

    expect(tankProgress[0]?.level).toBeLessThanOrEqual(tankProgress[1]?.level ?? 0);
    expect(tankProgress[1]?.level).toBeGreaterThan(tankProgress[0]?.level ?? 0);
    expect(tankProgress[1]).toMatchObject({ xp: 1_000_000, battles: 500 });
  });

  it('exports progression only for tanks that earned XP', async () => {
    const { service, prisma } = createService([7n]);

    await service.analytics('user');

    expect(prisma.playerTank.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: { in: [7n] }, progressXp: { gt: 0 } } }));
  });
});
