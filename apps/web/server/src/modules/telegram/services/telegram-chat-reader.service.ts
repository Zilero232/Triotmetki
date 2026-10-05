import { Injectable } from '@nestjs/common';

import type { LinkedChat } from '../telegram.types';

import { PrismaService } from '../../../core';
import { BOT_USER_SELECT, toLinkedBotUser } from '../../bot-commands';

@Injectable()
export class TelegramChatReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async find(telegramId: bigint): Promise<LinkedChat | null> {
    const account = await this.prisma.telegramAccount.findUnique({
      where: { telegramId },
      select: { userId: true, languageCode: true, user: { select: BOT_USER_SELECT } }
    });

    return account ? { ...toLinkedBotUser({ userId: account.userId, user: account.user, languageHint: account.languageCode }), telegramId } : null;
  }
}
