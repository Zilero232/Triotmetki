import { Injectable, Logger } from '@nestjs/common';
import { addHours, subHours, subMinutes } from 'date-fns';

import type { ClanEventView, ClanItemScope, RsvpRequest, SetAttendanceRequest, SyncAttendanceInput } from '../clan-workspace.types';

import { toJsonValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { ATTENDANCE_BONUS_TYPES } from '../config/attendance.constants';
import { CLAN_WORKSPACE } from '../config/workspace.constants';
import { attendedAccounts } from '../lib/attendance/attendance';
import { eventDataSchema } from '../lib/clan-event/clan-event.schemas';
import { ClanAccessService } from './clan-access.service';
import { ClanEventsWriterService } from './clan-events-writer.service';

@Injectable()
export class ClanEventAttendanceWriterService {
  private readonly logger = new Logger(ClanEventAttendanceWriterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClanAccessService,
    private readonly events: ClanEventsWriterService
  ) {}

  async setAttendance({ clanId, userId, id, entries }: SetAttendanceRequest): Promise<ClanEventView> {
    await this.access.officer({ clanId, userId });
    await this.events.find({ clanId, userId, id });

    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.clanAttendance.upsert({
          where: { eventId_accountId: { eventId: id, accountId: BigInt(entry.accountId) } },
          create: { eventId: id, accountId: BigInt(entry.accountId), status: entry.status, source: 'manual' },
          update: { status: entry.status, source: 'manual' }
        })
      )
    );

    return this.events.view(id);
  }

  async rsvp({ clanId, userId, id, status }: RsvpRequest): Promise<ClanEventView> {
    const membership = await this.access.member({ clanId, userId });

    await this.events.find({ clanId, userId, id });

    await this.prisma.clanAttendance.upsert({
      where: { eventId_accountId: { eventId: id, accountId: membership.accountId } },
      create: { eventId: id, accountId: membership.accountId, status, source: 'manual' },
      update: { status }
    });

    return this.events.view(id);
  }

  async syncFromApi({ clanId, userId, id }: ClanItemScope): Promise<ClanEventView> {
    await this.access.officer({ clanId, userId });
    await this.sync({ event: await this.events.find({ clanId, userId, id }), now: new Date() });

    return this.events.view(id);
  }

  async syncFinished(now: Date): Promise<number> {
    const endedBefore = subHours(now, CLAN_WORKSPACE.syncDelayHours);
    const endedAfter = subHours(now, CLAN_WORKSPACE.syncLookbackHours);
    const events = await this.prisma.clanEvent.findMany({
      where: {
        kind: { in: ['stronghold', 'clanWars'] },
        OR: [
          { endsAt: { lte: endedBefore, gte: endedAfter } },
          {
            endsAt: null,
            startsAt: {
              lte: subHours(endedBefore, CLAN_WORKSPACE.defaultEventHours),
              gte: subHours(endedAfter, CLAN_WORKSPACE.defaultEventHours)
            }
          }
        ]
      }
    });

    let synced = 0;

    for (const event of events) {
      if (!eventDataSchema.parse(event.data).attendanceSyncedAt) {
        synced += (await this.sync({ event, now })) > 0 ? 1 : 0;
      }
    }

    return synced;
  }

  private async sync({ event, now }: SyncAttendanceInput): Promise<number> {
    const bonusTypes = ATTENDANCE_BONUS_TYPES[event.kind];
    const endsAt = event.endsAt ?? addHours(event.startsAt, CLAN_WORKSPACE.defaultEventHours);

    if (bonusTypes.length === 0) {
      return 0;
    }

    const members = await this.prisma.clanMember.findMany({ where: { clanId: event.clanId }, select: { accountId: true } });
    const battles = await this.prisma.battle.findMany({
      where: {
        accountId: { in: members.map((member) => member.accountId) },
        startedAt: { gte: subMinutes(event.startsAt, CLAN_WORKSPACE.battleLeadMinutes), lte: endsAt }
      },
      select: { accountId: true, battleType: true }
    });

    const attended = attendedAccounts({ battles, bonusTypes });
    const manual = await this.prisma.clanAttendance.findMany({
      where: { eventId: event.id, source: 'manual', status: { in: ['attended', 'absent'] } },
      select: { accountId: true }
    });

    const locked = new Set(manual.map((row) => row.accountId));
    const writes = [...attended.entries()].filter(([accountId]) => !locked.has(accountId));

    await this.prisma.$transaction([
      ...writes.map(([accountId, present]) =>
        this.prisma.clanAttendance.upsert({
          where: { eventId_accountId: { eventId: event.id, accountId } },
          create: { eventId: event.id, accountId, status: present ? 'attended' : 'absent', source: 'api' },
          update: { status: present ? 'attended' : 'absent', source: 'api' }
        })
      ),
      this.prisma.clanEvent.update({
        where: { id: event.id },
        data: { data: toJsonValue({ ...eventDataSchema.parse(event.data), attendanceSyncedAt: now.toISOString() }) }
      })
    ]);

    this.logger.debug(`attendance for ${event.id}: ${writes.length} members`);

    return writes.length;
  }
}
