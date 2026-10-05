import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TelegramAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { BOT } from '../../config/bot.constants';
import { TelegramChatReaderService } from '../telegram-chat-reader.service';

type AccountInput = {
  locale: string;
  languageCode: string | null;
  lestaAccounts: { accountId: bigint; player: { nickname: string } }[];
};

const account = ({ locale, languageCode, lestaAccounts }: AccountInput) =>
  Object.assign(mock<TelegramAccount>({ userId: 'user', languageCode }), { user: { locale, lestaAccounts } });

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  return { service: new TelegramChatReaderService(prisma), prisma };
};

describe('TelegramChatReaderService.find', () => {
  it('returns null for a Telegram user who never linked', async () => {
    const { service, prisma } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(null);

    await expect(service.find(42n)).resolves.toBeNull();
  });

  it('exposes the primary Lesta account of the linked user', async () => {
    const { service, prisma } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(
      account({ locale: 'en', languageCode: 'ru', lestaAccounts: [{ accountId: 7n, player: { nickname: 'Tanker' } }] })
    );

    await expect(service.find(42n)).resolves.toEqual({ userId: 'user', telegramId: 42n, accountId: 7n, nickname: 'Tanker', locale: 'en' });
  });

  it('keeps a user without a Lesta account linked with empty account fields', async () => {
    const { service, prisma } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(account({ locale: 'ru', languageCode: null, lestaAccounts: [] }));

    await expect(service.find(42n)).resolves.toMatchObject({ accountId: null, nickname: null });
  });

  it('falls back to the Telegram language when the site locale is empty', async () => {
    const { service, prisma } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(account({ locale: '', languageCode: 'en-GB', lestaAccounts: [] }));

    expect((await service.find(42n))?.locale).toBe('en');
  });

  it('falls back to the default locale for an unsupported language', async () => {
    const { service, prisma } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(account({ locale: '', languageCode: 'de', lestaAccounts: [] }));

    expect((await service.find(42n))?.locale).toBe(BOT.fallbackLocale);
  });
});
