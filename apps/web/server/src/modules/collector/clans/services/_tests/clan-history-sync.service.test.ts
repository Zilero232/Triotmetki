import { fromUnixTime } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Player } from '../../../../../../generated';
import type { LestaClients, PrismaService } from '../../../../../core';
import type { ClanMemberHistoryEntry } from '../../../../../lib/lesta';

import { ClanHistorySyncService } from '../clan-history-sync.service';

const closed: ClanMemberHistoryEntry = { clan_id: 7, joined_at: 1_600_000_000, left_at: 1_600_100_000, role: 'commander' };
const open: ClanMemberHistoryEntry = { clan_id: 8, joined_at: 1_600_200_000, left_at: null, role: 'private' };

const createHistory = (histories: Record<string, ClanMemberHistoryEntry[] | null>, known: number[]) => {
  const prisma = mockDeep<PrismaService>();
  const clients = mockDeep<LestaClients>();

  prisma.$transaction.mockResolvedValue([]);
  prisma.player.findMany.mockResolvedValue(known.map((accountId) => mock<Player>({ accountId: BigInt(accountId) })));
  clients.bulk.clans.memberhistory.mockResolvedValue(histories);

  return { prisma, clients, service: new ClanHistorySyncService(prisma, clients) };
};

describe('ClanHistorySyncService.history', () => {
  it('replaces the closed memberships of a known account and leaves the open one to the poller', async () => {
    const { prisma, service } = createHistory({ 1: [closed, open] }, [1]);

    expect(await service.history({ accountIds: [1] })).toEqual({ accounts: 1, rows: 1 });
    expect(prisma.playerClanHistory.deleteMany.mock.calls[0]?.[0]?.where).toMatchObject({ accountId: 1n, leftAt: { not: null } });

    expect(prisma.playerClanHistory.createMany.mock.calls[0]?.[0]?.data).toEqual([
      { accountId: 1n, clanId: 7n, role: 'commander', joinedAt: fromUnixTime(closed.joined_at), leftAt: fromUnixTime(closed.left_at ?? 0) }
    ]);
  });

  it('skips accounts that were never stored', async () => {
    const { prisma, service } = createHistory({ 1: [closed], 2: [closed] }, [1]);

    expect(await service.history({ accountIds: [1, 2] })).toEqual({ accounts: 1, rows: 1 });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('keeps the stored history when Lesta returns no history for the account', async () => {
    const { prisma, service } = createHistory({ 1: null }, [1]);

    expect(await service.history({ accountIds: [1] })).toEqual({ accounts: 1, rows: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.playerClanHistory.deleteMany).not.toHaveBeenCalled();
  });

  it('clears closed memberships when Lesta reports an empty history', async () => {
    const { prisma, service } = createHistory({ 1: [] }, [1]);

    await service.history({ accountIds: [1] });

    expect(prisma.playerClanHistory.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.playerClanHistory.createMany.mock.calls[0]?.[0]?.data).toEqual([]);
  });

  it('stores a missing role as null', async () => {
    const { prisma, service } = createHistory({ 1: [{ ...closed, role: null }] }, [1]);

    await service.history({ accountIds: [1] });

    expect(prisma.playerClanHistory.createMany.mock.calls[0]?.[0]?.data).toEqual([expect.objectContaining({ role: null })]);
  });
});
