import { Injectable } from '@nestjs/common';
import { addHours, differenceInMinutes, subMinutes } from 'date-fns';

import type { ClanEvent } from '../../../../generated';
import type { ClanEventView, ClanItemScope, CreateClanEventRequest, ListEventsRequest, UpdateClanEventRequest } from '../clan-workspace.types';

import { AppBadRequestException, AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { CLAN_WORKSPACE } from '../config/workspace.constants';
import { toClanEventView } from '../mappers/clan-event.mappers';
import { ClanAccessService } from './clan-access.service';

@Injectable()
export class ClanEventsWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClanAccessService
  ) {}

  async list({ clanId, userId, from, to }: ListEventsRequest): Promise<ClanEventView[]> {
    await this.access.member({ clanId, userId });

    const events = await this.prisma.clanEvent.findMany({
      where: { clanId: BigInt(clanId), startsAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } },
      orderBy: { startsAt: 'asc' },
      include: { attendance: true }
    });

    const nicknames = await this.access.nicknames(events.flatMap((event) => event.attendance.map((row) => row.accountId)));

    return events.map((event) => toClanEventView({ event, nicknames }));
  }

  async create({ clanId, userId, kind, title, startsAt, endsAt, remindMinutesBefore }: CreateClanEventRequest): Promise<ClanEventView> {
    await this.access.officer({ clanId, userId });

    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : addHours(start, CLAN_WORKSPACE.defaultEventHours);

    if (end <= start) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'The event must end after it starts');
    }

    const lead = remindMinutesBefore ?? CLAN_WORKSPACE.reminderLeadMinutes;
    const event = await this.prisma.clanEvent.create({
      data: { clanId: BigInt(clanId), kind, title, startsAt: start, endsAt: end, remindAt: subMinutes(start, lead) },
      include: { attendance: true }
    });

    return toClanEventView({ event, nicknames: new Map() });
  }

  async update({ clanId, userId, id, kind, title, startsAt, endsAt, remindMinutesBefore }: UpdateClanEventRequest): Promise<ClanEventView> {
    await this.access.officer({ clanId, userId });

    const event = await this.find({ clanId, userId, id });
    const start = startsAt ? new Date(startsAt) : event.startsAt;
    const end = endsAt ? new Date(endsAt) : event.endsAt;
    const lead = remindMinutesBefore ?? (event.remindAt ? differenceInMinutes(event.startsAt, event.remindAt) : null);
    const remindAt = lead === null ? null : subMinutes(start, lead);

    if (end && end <= start) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'The event must end after it starts');
    }

    await this.prisma.clanEvent.update({
      where: { id },
      data: {
        ...(kind ? { kind } : {}),
        ...(title ? { title } : {}),
        startsAt: start,
        endsAt: end,
        remindAt,
        ...(remindAt?.getTime() === event.remindAt?.getTime() ? {} : { remindedAt: null })
      }
    });

    return this.view(id);
  }

  async remove({ clanId, userId, id }: ClanItemScope): Promise<void> {
    await this.access.officer({ clanId, userId });
    await this.find({ clanId, userId, id });
    await this.prisma.clanEvent.delete({ where: { id } });
  }

  async find({ clanId, id }: ClanItemScope): Promise<ClanEvent> {
    const event = await this.prisma.clanEvent.findFirst({ where: { id, clanId: BigInt(clanId) } });

    if (!event) {
      throw new AppNotFoundException('NOT_FOUND', `No event ${id} in clan ${clanId}`);
    }

    return event;
  }

  async view(id: string): Promise<ClanEventView> {
    const event = await this.prisma.clanEvent.findUniqueOrThrow({ where: { id }, include: { attendance: true } });
    const nicknames = await this.access.nicknames(event.attendance.map((row) => row.accountId));

    return toClanEventView({ event, nicknames });
  }
}
