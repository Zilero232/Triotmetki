import type { AuthService } from '@thallesp/nestjs-better-auth';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TelegramAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AUTH_PROVIDER, isPlaceholderEmail } from '../../../../lib/auth';
import { TelegramIdentityWriterService } from '../telegram-identity-writer.service';

type AuthContext = Awaited<AuthService['instance']['$context']>;
type CreatedUser = Awaited<ReturnType<AuthContext['internalAdapter']['createUser']>>;
type CreatedSession = Awaited<ReturnType<AuthContext['internalAdapter']['createSession']>>;

const IDENTITY = { telegramId: 42n, username: 'tanker', name: 'Tanker', languageCode: 'ru' };

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const auth = mockDeep<AuthService>();
  const context = mockDeep<AuthContext>();

  Object.assign(auth.instance, { $context: Promise.resolve(context) });
  context.internalAdapter.createUser.mockResolvedValue(mock<CreatedUser>({ id: 'new-user' }));

  return { service: new TelegramIdentityWriterService(prisma, auth), prisma, adapter: context.internalAdapter };
};

describe('TelegramIdentityWriterService.ensureUser', () => {
  it('returns the user already linked to the Telegram id without creating one', async () => {
    const { service, prisma, adapter } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ userId: 'existing' }));

    await expect(service.ensureUser(IDENTITY)).resolves.toBe('existing');
    expect(adapter.createUser).not.toHaveBeenCalled();
    expect(prisma.telegramAccount.create).not.toHaveBeenCalled();
  });

  it('creates a user with a placeholder email, a Telegram account and the link row', async () => {
    const { service, prisma, adapter } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(null);

    await expect(service.ensureUser(IDENTITY)).resolves.toBe('new-user');

    const email = adapter.createUser.mock.calls[0]?.[0].email ?? '';

    expect(isPlaceholderEmail(email)).toBe(true);

    expect(adapter.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'new-user', providerId: AUTH_PROVIDER.telegram, accountId: '42' })
    );

    expect(prisma.telegramAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'new-user', telegramId: 42n }) })
    );
  });
});

describe('TelegramIdentityWriterService.issueSessionToken', () => {
  it('returns the token of a fresh session for the user', async () => {
    const { service, adapter } = createService();

    adapter.createSession.mockResolvedValue(mock<CreatedSession>({ token: 'session-token' }));

    await expect(service.issueSessionToken('user')).resolves.toBe('session-token');
    expect(adapter.createSession).toHaveBeenCalledWith('user');
  });
});
