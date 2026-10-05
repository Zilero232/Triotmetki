import { Inject, Injectable } from '@nestjs/common';

import type { LestaClients } from '../../../../core';
import type { AccountBatchPayload } from '../../contracts';

import { LESTA_CLIENTS, PrismaService } from '../../../../core';
import { toClanHistoryRecord } from '../mappers/clan-member.mappers';

@Injectable()
export class ClanHistorySyncService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients
  ) {}

  async history({ accountIds }: AccountBatchPayload) {
    const histories = await this.clients.bulk.clans.memberhistory({ accountIds });
    const known = await this.prisma.player.findMany({ where: { accountId: { in: accountIds.map(BigInt) } }, select: { accountId: true } });
    let rows = 0;

    for (const { accountId } of known) {
      const history = histories[String(accountId)];

      if (!history) {
        continue;
      }

      const entries = history.filter((entry) => entry.left_at);

      await this.prisma.$transaction([
        this.prisma.playerClanHistory.deleteMany({ where: { accountId, leftAt: { not: null } } }),
        this.prisma.playerClanHistory.createMany({
          data: entries.map((entry) => toClanHistoryRecord({ accountId, entry }))
        })
      ]);

      rows += entries.length;
    }

    return { accounts: known.length, rows };
  }
}
