import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TelegramAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { TelegramAccountsWriterService } from '../telegram-accounts-writer.service';

const NOW = new Date('2026-09-26T12:00:00.000Z');

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.$transaction.mockResolvedValue([]);

  return { service: new TelegramAccountsWriterService(prisma), prisma };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TelegramAccountsWriterService.findUserId', () => {
  it('returns the owner of a linked Telegram id and null otherwise', async () => {
    const { service, prisma } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValueOnce(mock<TelegramAccount>({ userId: 'user' })).mockResolvedValueOnce(null);

    await expect(service.findUserId(42n)).resolves.toBe('user');
    await expect(service.findUserId(43n)).resolves.toBeNull();
  });
});

describe('TelegramAccountsWriterService.link', () => {
  it('replaces any other Telegram account of the user and upserts this one in one transaction', async () => {
    const { service, prisma } = createService();

    await service.link({ userId: 'user', telegramId: 42n, username: 'ivan', name: 'ivan', languageCode: 'ru' });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.telegramAccount.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user', NOT: { telegramId: 42n } } }));

    expect(prisma.telegramAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { telegramId: 42n },
        create: { userId: 'user', telegramId: 42n, username: 'ivan', languageCode: 'ru', lastSeenAt: NOW },
        update: { username: 'ivan', languageCode: 'ru', lastSeenAt: NOW }
      })
    );
  });
});
