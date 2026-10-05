import { Inject, Injectable } from '@nestjs/common';

import type { WebhookEmitter } from '../../../webhooks';
import type { GainedMark } from '../lib/marks-gain/marks-gain.types';

import { PrismaService } from '../../../../core';
import { entitledSubscriptionWhere } from '../../../billing';
import { markGainedKey, WEBHOOK_EMITTER } from '../../../webhooks';

@Injectable()
export class TrackingAnnounceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WEBHOOK_EMITTER) private readonly webhooks: WebhookEmitter
  ) {}

  async announceMarks(gained: readonly GainedMark[]): Promise<void> {
    if (gained.length === 0) {
      return;
    }

    const players = await this.prisma.player.findMany({
      where: { accountId: { in: [...new Set(gained.map((mark) => mark.accountId))] } },
      select: { accountId: true, clanId: true, nickname: true }
    });

    const byAccount = new Map(players.map((player) => [player.accountId, player]));

    for (const mark of gained) {
      const player = byAccount.get(mark.accountId);

      await this.webhooks.emit({
        event: 'mark.gained',
        dedupeKey: markGainedKey(mark),
        subject: { accountIds: [Number(mark.accountId)], clanIds: player?.clanId ? [Number(player.clanId)] : [] },
        data: {
          accountId: Number(mark.accountId),
          nickname: player?.nickname ?? null,
          tankId: mark.tankId,
          marks: mark.marks,
          previousMarks: mark.previous,
          percent: null,
          source: 'api'
        }
      });
    }
  }

  async subscribers(accountIds: readonly bigint[]): Promise<Set<number>> {
    const links = await this.prisma.userLestaAccount.findMany({
      where: { accountId: { in: [...accountIds] }, user: { subscriptions: { some: entitledSubscriptionWhere(new Date()) } } },
      select: { accountId: true },
      distinct: ['accountId']
    });

    return new Set(links.map((link) => Number(link.accountId)));
  }
}
