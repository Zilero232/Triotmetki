import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, Player, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppForbiddenException } from '../../../../common/exceptions';
import { UserAccountsReaderService } from '../../../accounts';
import { CommunityAccountsReaderService } from '../community-accounts-reader.service';

const link = (accountId: bigint) => mock<UserLestaAccount>({ accountId });

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  return { service: new CommunityAccountsReaderService(prisma, new UserAccountsReaderService(prisma)), prisma };
};

describe('CommunityAccountsReaderService.accountOf', () => {
  it('refuses a user without a linked game account', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([]);

    await expect(service.accountOf({ userId: 'u1' })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('refuses an account id that is not linked to the user', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(7n)]);

    await expect(service.accountOf({ userId: 'u1', accountId: 8 })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('returns the first link, ordered primary first, when no account is named', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(7n), link(8n)]);

    expect(await service.accountOf({ userId: 'u1' })).toBe(7n);

    expect(prisma.userLestaAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, orderBy: [{ isPrimary: 'desc' }, { linkedAt: 'asc' }] })
    );
  });

  it('returns the named account when it is one of the user links', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(7n), link(8n)]);

    expect(await service.accountOf({ userId: 'u1', accountId: 8 })).toBe(8n);
  });
});

describe('CommunityAccountsReaderService.statsOf', () => {
  it('skips the database for an empty list', async () => {
    const { service, prisma } = createService();

    expect((await service.statsOf([])).size).toBe(0);
    expect(prisma.accountRating.findMany).not.toHaveBeenCalled();
  });

  it('keys overall ratings by account and asks once per unique account', async () => {
    const { service, prisma } = createService();

    prisma.accountRating.findMany.mockResolvedValue([mock<AccountRating>({ accountId: 7n, battles: 1000, wn8: 1500, winRate: 0.52 })]);

    const stats = await service.statsOf([7n, 7n]);

    expect(stats.get(7n)).toEqual({ battles: 1000, wn8: 1500, winRate: 0.52 });

    expect(prisma.accountRating.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: { in: [7n] }, period: 'overall', player: { isHidden: false } } })
    );
  });
});

describe('CommunityAccountsReaderService.nicknamesOf', () => {
  it('maps accounts to nicknames', async () => {
    const { service, prisma } = createService();

    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 7n, nickname: 'Tanker' })]);

    expect((await service.nicknamesOf([7n])).get(7n)).toBe('Tanker');
  });

  it('names no player who asked for deletion', async () => {
    const { service, prisma } = createService();

    prisma.player.findMany.mockResolvedValue([]);

    await service.nicknamesOf([7n]);

    expect(prisma.player.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: { in: [7n] }, isHidden: false } }));
  });
});
