import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TelegramAccount, User, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppConflictException, AppNotFoundException } from '../../../../common/exceptions';
import { AUTH_PROVIDER, placeholderEmail } from '../../../../lib/auth';
import { LinkedAccountsWriterService } from '../linked-accounts-writer.service';

const NOW = new Date('2026-09-26T12:00:00.000Z');
const LINKED_AT = new Date('2026-01-01T00:00:00.000Z');

const link = (accountId: bigint, isPrimary: boolean): UserLestaAccount =>
  mock<UserLestaAccount>({ userId: 'user', accountId, isPrimary, linkedAt: LINKED_AT, tokenExpiresAt: null, tokenStaleAt: null });

type UserInput = { email?: string; telegramAccount?: TelegramAccount | null };

const user = ({ email = 'player@example.com', telegramAccount = null }: UserInput = {}) =>
  Object.assign(mock<User>({ id: 'user', name: 'Tanker', email }), {
    lestaAccounts: [Object.assign(link(7n, true), { player: { nickname: 'Tanker' } })],
    telegramAccount
  });

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.user.findUnique.mockResolvedValue(user());
  prisma.$transaction.mockResolvedValue([]);

  return { service: new LinkedAccountsWriterService(prisma), prisma };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LinkedAccountsWriterService.get', () => {
  it('answers 404 for a deleted user', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.get('user')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('hides a placeholder email', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(user({ email: placeholderEmail({ provider: AUTH_PROVIDER.telegram, id: 42 }) }));

    expect((await service.get('user')).email).toBeNull();
  });

  it('lists the Lesta accounts and a linked Telegram account', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(user({ telegramAccount: mock<TelegramAccount>({ telegramId: 42n, username: null }) }));

    const accounts = await service.get('user');

    expect(accounts.email).toBe('player@example.com');

    expect(accounts.lesta).toEqual([
      { accountId: 7, nickname: 'Tanker', isPrimary: true, linkedAt: LINKED_AT.toISOString(), tokenExpiresAt: null, isStale: false }
    ]);

    expect(accounts.telegram).toEqual({ telegramId: '42', username: null });
  });
});

describe('LinkedAccountsWriterService.makePrimary', () => {
  it('refuses an account linked to someone else', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.makePrimary({ userId: 'user', accountId: 8 })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('clears the old primary and sets the new one in one transaction', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValue(link(8n, false));

    await service.makePrimary({ userId: 'user', accountId: 8 });

    expect(prisma.$transaction).toHaveBeenCalledOnce();

    expect(prisma.userLestaAccount.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user' }, data: { isPrimary: false } })
    );

    expect(prisma.userLestaAccount.update).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: 8n }, data: { isPrimary: true } }));
  });
});

describe('LinkedAccountsWriterService.unlink', () => {
  it('refuses to remove the only way to sign in', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValue(link(7n, true));
    prisma.account.count.mockResolvedValue(1);

    await expect(service.unlink({ userId: 'user', accountId: 7 })).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses an account that is not linked to the user', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);
    prisma.account.count.mockResolvedValue(3);

    await expect(service.unlink({ userId: 'user', accountId: 9 })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('removes the link, its sign-in and revokes the mod devices of that account', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValueOnce(link(8n, false));
    prisma.account.count.mockResolvedValue(2);

    await service.unlink({ userId: 'user', accountId: 8 });

    expect(prisma.userLestaAccount.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: 8n } }));

    expect(prisma.account.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user', providerId: AUTH_PROVIDER.lesta, accountId: '8' } })
    );

    expect(prisma.modDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user', accountId: 8n, revokedAt: null },
        data: { revokedAt: NOW }
      })
    );

    expect(prisma.userLestaAccount.update).not.toHaveBeenCalled();
  });

  it('promotes the oldest remaining account when the primary is unlinked', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValueOnce(link(7n, true)).mockResolvedValueOnce(link(8n, false));
    prisma.account.count.mockResolvedValue(2);

    await service.unlink({ userId: 'user', accountId: 7 });

    expect(prisma.userLestaAccount.update).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: 8n }, data: { isPrimary: true } }));
  });

  it('leaves no primary when the last Lesta account is unlinked', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValueOnce(link(7n, true)).mockResolvedValueOnce(null);
    prisma.account.count.mockResolvedValue(2);

    await service.unlink({ userId: 'user', accountId: 7 });

    expect(prisma.userLestaAccount.update).not.toHaveBeenCalled();
  });
});
