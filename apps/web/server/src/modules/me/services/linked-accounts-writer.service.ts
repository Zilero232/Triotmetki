import { Injectable } from '@nestjs/common';

import type { AccountLinkInput, LinkedAccounts } from '../me.types';

import { AppConflictException, AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { AUTH_PROVIDER, isPlaceholderEmail } from '../../../lib/auth';
import { toLinkedLestaAccount } from '../mappers/linked-accounts.mappers';

@Injectable()
export class LinkedAccountsWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<LinkedAccounts> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { lestaAccounts: { include: { player: { select: { nickname: true } } }, orderBy: { linkedAt: 'asc' } }, telegramAccount: true }
    });

    if (!user) {
      throw new AppNotFoundException('NOT_FOUND', 'User not found');
    }

    return {
      userId: user.id,
      name: user.name,
      email: isPlaceholderEmail(user.email) ? null : user.email,
      lesta: user.lestaAccounts.map(toLinkedLestaAccount),
      telegram: user.telegramAccount ? { telegramId: user.telegramAccount.telegramId.toString(), username: user.telegramAccount.username } : null
    };
  }

  async makePrimary({ userId, accountId }: AccountLinkInput): Promise<LinkedAccounts> {
    const account = BigInt(accountId);
    const link = await this.prisma.userLestaAccount.findFirst({ where: { userId, accountId: account } });

    if (!link) {
      throw new AppNotFoundException('NOT_FOUND', 'This Lesta account is not linked to you');
    }

    await this.prisma.$transaction([
      this.prisma.userLestaAccount.updateMany({ where: { userId }, data: { isPrimary: false } }),
      this.prisma.userLestaAccount.update({ where: { accountId: account }, data: { isPrimary: true } })
    ]);

    return this.get(userId);
  }

  async unlink({ userId, accountId }: AccountLinkInput): Promise<LinkedAccounts> {
    const account = BigInt(accountId);

    const [link, signIns] = await Promise.all([
      this.prisma.userLestaAccount.findFirst({ where: { userId, accountId: account } }),
      this.prisma.account.count({ where: { userId } })
    ]);

    if (!link) {
      throw new AppNotFoundException('NOT_FOUND', 'This Lesta account is not linked to you');
    }

    if (signIns <= 1) {
      throw new AppConflictException('CONFLICT', 'This is your only way to sign in');
    }

    await this.prisma.$transaction([
      this.prisma.userLestaAccount.delete({ where: { accountId: account } }),
      this.prisma.account.deleteMany({ where: { userId, providerId: AUTH_PROVIDER.lesta, accountId: String(accountId) } }),
      this.prisma.modDevice.updateMany({ where: { userId, accountId: account, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);

    if (link.isPrimary) {
      const next = await this.prisma.userLestaAccount.findFirst({ where: { userId }, orderBy: { linkedAt: 'asc' } });

      if (next) {
        await this.prisma.userLestaAccount.update({ where: { accountId: next.accountId }, data: { isPrimary: true } });
      }
    }

    return this.get(userId);
  }
}
