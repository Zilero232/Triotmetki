import type { Shells } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { seasonOf } from '@otmetki/schemas';

import type { BalanceInput, GrantShellsInput, SpendShellsInput } from '../progression.types';

import { AppConflictException } from '../../../common/exceptions';
import { toJsonValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { SHELL_LEDGER } from '../config/shell-ledger.constants';

@Injectable()
export class ShellLedgerWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async grant({ userId, amount, reason, key, points, now, context }: GrantShellsInput): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.shellLedgerEntry.createMany({
        data: [{ userId, amount, reason, key, context: context ? toJsonValue(context) : undefined }],
        skipDuplicates: true
      });

      if (created.count === 0) {
        return false;
      }

      if (points > 0) {
        const season = seasonOf(now).code;

        await tx.seasonProgress.upsert({
          where: { userId_season: { userId, season } },
          create: { userId, season, points },
          update: { points: { increment: points } }
        });
      }

      return true;
    });
  }

  async spend({ userId, amount, key, context, tx }: SpendShellsInput): Promise<void> {
    const balance = await this.balanceIn({ userId, client: tx });

    if (balance < amount) {
      throw new AppConflictException('CONFLICT', `Not enough shells: ${balance} of ${amount}`);
    }

    await tx.shellLedgerEntry.create({
      data: { userId, amount: -amount, reason: 'purchase', key, context: context ? toJsonValue(context) : undefined }
    });
  }

  async balance(userId: string): Promise<number> {
    return this.balanceIn({ userId, client: this.prisma });
  }

  async summary(userId: string): Promise<Shells> {
    const [earned, spent, entries] = await Promise.all([
      this.prisma.shellLedgerEntry.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
      this.prisma.shellLedgerEntry.aggregate({ where: { userId, amount: { lt: 0 } }, _sum: { amount: true } }),
      this.prisma.shellLedgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: SHELL_LEDGER.recentEntries,
        select: { id: true, amount: true, reason: true, createdAt: true }
      })
    ]);

    const totalEarned = earned._sum.amount ?? 0;
    const totalSpent = Math.abs(spent._sum.amount ?? 0);

    return {
      balance: Math.max(0, totalEarned - totalSpent),
      earned: totalEarned,
      spent: totalSpent,
      entries: entries.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() }))
    };
  }

  private async balanceIn({ userId, client }: BalanceInput): Promise<number> {
    const sum = await client.shellLedgerEntry.aggregate({ where: { userId }, _sum: { amount: true } });

    return Math.max(0, sum._sum.amount ?? 0);
  }
}
