import { Injectable } from '@nestjs/common';

import type { LinkTelegramInput, TelegramAccountStore } from '../../../lib/auth';

import { PrismaService } from '../../../core';

@Injectable()
export class TelegramAccountsWriterService implements TelegramAccountStore {
  constructor(private readonly prisma: PrismaService) {}

  async findUserId(telegramId: bigint): Promise<string | null> {
    const account = await this.prisma.telegramAccount.findUnique({ where: { telegramId }, select: { userId: true } });

    return account?.userId ?? null;
  }

  async link({ userId, telegramId, username, languageCode }: LinkTelegramInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.telegramAccount.deleteMany({ where: { userId, NOT: { telegramId } } }),
      this.prisma.telegramAccount.upsert({
        where: { telegramId },
        create: { userId, telegramId, username, languageCode, lastSeenAt: new Date() },
        update: { username, languageCode, lastSeenAt: new Date() }
      })
    ]);
  }
}
