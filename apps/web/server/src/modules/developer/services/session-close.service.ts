import { Inject, Injectable, Optional } from '@nestjs/common';
import { subMinutes } from 'date-fns';

import type { WebhookEmitter } from '../../webhooks';
import type { SessionEventsSink } from '../developer.types';

import { percentOf, ratio, toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { WEBHOOK_EMITTER } from '../../webhooks';
import { SESSION_CLOSE } from '../config';
import { SESSION_EVENTS } from '../config/session-events.constants';
import { isSessionEnded } from '../lib/session-end/session-end';

@Injectable()
export class SessionCloseService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WEBHOOK_EMITTER) private readonly webhooks: WebhookEmitter,
    @Optional() @Inject(SESSION_EVENTS) private readonly sessionEvents: SessionEventsSink | null = null
  ) {}

  async closeIdle(now = new Date()): Promise<number> {
    const idleSince = subMinutes(now, SESSION_CLOSE.idleMinutes);

    const candidates = await this.prisma.playSession.findMany({
      where: { kind: 'live', status: 'open', OR: [{ lastActivityAt: { lt: idleSince } }, { player: { logoutAt: { not: null } } }] },
      orderBy: { lastActivityAt: 'asc' },
      take: SESSION_CLOSE.batchSize,
      include: { player: { select: { clanId: true, nickname: true, logoutAt: true } } }
    });

    const sessions = candidates.filter((session) =>
      isSessionEnded({ lastActivityAt: session.lastActivityAt, logoutAt: session.player.logoutAt, idleSince })
    );

    let closed = 0;

    for (const session of sessions) {
      const claimed = await this.prisma.playSession.updateMany({
        where: { id: session.id, status: 'open' },
        data: { status: 'closed', endedAt: session.lastActivityAt }
      });

      if (claimed.count === 0 || session.battles === 0) {
        continue;
      }

      closed += 1;

      await this.webhooks.emit({
        event: 'session.ended',
        dedupeKey: `session:${session.id}`,
        subject: { accountIds: [toNumber(session.accountId)], clanIds: session.player.clanId === null ? [] : [toNumber(session.player.clanId)] },
        data: {
          sessionId: session.id,
          accountId: toNumber(session.accountId),
          nickname: session.player.nickname,
          source: session.source,
          startedAt: session.startedAt.toISOString(),
          endedAt: session.lastActivityAt.toISOString(),
          battles: session.battles,
          wins: session.wins,
          winRate: percentOf({ value: session.wins, by: session.battles }),
          avgDamage: ratio({ value: session.damageDealt, by: session.battles }),
          wn8: session.wn8
        }
      });

      if (session.source === 'mod') {
        await this.sessionEvents?.ended({ sessionId: session.id, accountId: session.accountId });
      }
    }

    return closed;
  }
}
