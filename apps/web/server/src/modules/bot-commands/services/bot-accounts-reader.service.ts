import { Injectable } from '@nestjs/common';

import type { FindLinkedInput, LinkedBotUser } from '../bot-commands.types';

import { PrismaService } from '../../../core';
import { toLinkedBotUser } from '../mappers/bot-user.mappers';
import { BOT_USER_SELECT } from '../selects/bot-user.selects';

@Injectable()
export class BotAccountsReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async find({ providerId, externalId, languageHint }: FindLinkedInput): Promise<LinkedBotUser | null> {
    const account = await this.prisma.account.findUnique({
      where: { providerId_accountId: { providerId, accountId: externalId } },
      select: { userId: true, user: { select: BOT_USER_SELECT } }
    });

    return account ? toLinkedBotUser({ userId: account.userId, user: account.user, languageHint }) : null;
  }
}
