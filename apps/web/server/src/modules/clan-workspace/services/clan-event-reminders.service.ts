import { Injectable } from '@nestjs/common';
import { subMinutes } from 'date-fns';

import { PrismaService } from '../../../core';
import { NotificationService } from '../../notifications';
import { CLAN_WORKSPACE } from '../config/workspace.constants';
import { ClanAccessService } from './clan-access.service';

@Injectable()
export class ClanEventRemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClanAccessService,
    private readonly notifications: NotificationService
  ) {}

  async sendReminders(now: Date): Promise<number> {
    const startedSince = subMinutes(now, CLAN_WORKSPACE.reminderGraceMinutes);

    const due = await this.prisma.clanEvent.findMany({
      where: { remindAt: { lte: now }, remindedAt: null, startsAt: { gt: startedSince } },
      include: { workspace: { include: { clan: { select: { tag: true } } } } }
    });

    let sent = 0;

    for (const event of due) {
      const claimed = await this.prisma.clanEvent.updateMany({ where: { id: event.id, remindedAt: null }, data: { remindedAt: now } });

      if (claimed.count === 0) {
        continue;
      }

      sent += 1;

      const userIds = await this.access.userIdsOf({ clanId: event.clanId, officersOnly: false });

      await this.notifications.notifyMany({
        userIds,
        dedupeKey: `clan-event-${event.id}`,
        notification: {
          event: 'clanEventReminder',
          clanId: Number(event.clanId),
          clanTag: event.workspace.clan.tag,
          title: event.title,
          startsAt: event.startsAt.toISOString()
        }
      });
    }

    return sent;
  }
}
