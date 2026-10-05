import { subHours, subMinutes } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';
import type { ClanAccessService } from '../clan-access.service';

import { CLAN_WORKSPACE } from '../../config/workspace.constants';
import { ClanEventAttendanceWriterService } from '../clan-event-attendance-writer.service';
import { ClanEventsWriterService } from '../clan-events-writer.service';
import { advance, attendance, clanEvent, member, now, played, randomBattle, scope, skirmish, startsAt, withAttendance } from './clan-events.fixtures';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const access = mock<ClanAccessService>();

  access.officer.mockResolvedValue({ accountId: 1n, role: 'commander', isOfficer: true });
  access.member.mockResolvedValue({ accountId: 1n, role: 'commander', isOfficer: true });
  access.nicknames.mockResolvedValue(new Map());
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.clanEvent.findUniqueOrThrow.mockResolvedValue(withAttendance);
  prisma.clanAttendance.findMany.mockResolvedValue([]);

  const events = new ClanEventsWriterService(prisma, access);

  return { service: new ClanEventAttendanceWriterService(prisma, access, events), prisma, access };
};

const upsertedStatuses = (prisma: ReturnType<typeof createService>['prisma']) =>
  new Map(prisma.clanAttendance.upsert.mock.calls.map(([args]) => [args.where.eventId_accountId?.accountId, args.create.status]));

describe('ClanEventAttendanceWriterService.syncFinished', () => {
  it('marks members who fought a stronghold battle as attended and those who fought only other battles as absent', async () => {
    const { service, prisma } = createService();

    prisma.clanEvent.findMany.mockResolvedValue([clanEvent()]);
    prisma.clanMember.findMany.mockResolvedValue([member(1n), member(2n), member(3n)]);

    prisma.battle.findMany.mockResolvedValue([
      played({ accountId: 1n, bonusType: randomBattle }),
      played({ accountId: 1n, bonusType: advance }),
      played({ accountId: 2n, bonusType: randomBattle })
    ]);

    expect(await service.syncFinished(now)).toBe(1);

    expect(upsertedStatuses(prisma)).toEqual(
      new Map([
        [1n, 'attended'],
        [2n, 'absent']
      ])
    );
  });

  it('looks for the battles of the members in the event window', async () => {
    const { service, prisma } = createService();
    const event = clanEvent();

    prisma.clanEvent.findMany.mockResolvedValue([event]);
    prisma.clanMember.findMany.mockResolvedValue([member(1n)]);
    prisma.battle.findMany.mockResolvedValue([]);

    await service.syncFinished(now);

    expect(prisma.battle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          accountId: { in: [1n] },
          startedAt: { gte: subMinutes(event.startsAt, CLAN_WORKSPACE.battleLeadMinutes), lte: event.endsAt }
        },
        select: { accountId: true, battleType: true }
      })
    );
  });

  it('never overwrites a manual attended or absent row', async () => {
    const { service, prisma } = createService();

    prisma.clanEvent.findMany.mockResolvedValue([clanEvent()]);
    prisma.clanMember.findMany.mockResolvedValue([member(1n), member(2n)]);

    prisma.battle.findMany.mockResolvedValue([played({ accountId: 1n, bonusType: skirmish }), played({ accountId: 2n, bonusType: skirmish })]);

    prisma.clanAttendance.findMany.mockResolvedValue([attendance(2n, 'absent')]);

    await service.syncFinished(now);

    expect(prisma.clanAttendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 'e1', source: 'manual', status: { in: ['attended', 'absent'] } } })
    );

    expect(upsertedStatuses(prisma)).toEqual(new Map([[1n, 'attended']]));
  });

  it('skips events whose attendance was already synced', async () => {
    const { service, prisma } = createService();

    prisma.clanEvent.findMany.mockResolvedValue([clanEvent({ data: { attendanceSyncedAt: startsAt.toISOString() } })]);

    expect(await service.syncFinished(now)).toBe(0);
    expect(prisma.battle.findMany).not.toHaveBeenCalled();
  });

  it('stamps the event as synced with the time it was given', async () => {
    const { service, prisma } = createService();

    prisma.clanEvent.findMany.mockResolvedValue([clanEvent()]);
    prisma.clanMember.findMany.mockResolvedValue([member(1n)]);
    prisma.battle.findMany.mockResolvedValue([played({ accountId: 1n, bonusType: skirmish })]);

    await service.syncFinished(now);

    expect(prisma.clanEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'e1' },
        data: { data: expect.objectContaining({ attendanceSyncedAt: now.toISOString() }) }
      })
    );
  });

  it('also picks up events without an end time, judged by the default duration', async () => {
    const { service, prisma } = createService();

    prisma.clanEvent.findMany.mockResolvedValue([]);

    await service.syncFinished(now);

    expect(prisma.clanEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              endsAt: null,
              startsAt: {
                lte: subHours(now, CLAN_WORKSPACE.syncDelayHours + CLAN_WORKSPACE.defaultEventHours),
                gte: subHours(now, CLAN_WORKSPACE.syncLookbackHours + CLAN_WORKSPACE.defaultEventHours)
              }
            }
          ])
        })
      })
    );
  });
});

describe('ClanEventAttendanceWriterService.syncFromApi', () => {
  it('writes api attendance for the requested event', async () => {
    const { service, prisma, access } = createService();

    prisma.clanEvent.findFirst.mockResolvedValue(clanEvent());
    prisma.clanMember.findMany.mockResolvedValue([member(1n)]);
    prisma.battle.findMany.mockResolvedValue([played({ accountId: 1n, bonusType: skirmish })]);

    await service.syncFromApi({ ...scope, id: 'e1' });

    expect(access.officer).toHaveBeenCalledWith(scope);

    expect(prisma.clanAttendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ accountId: 1n, status: 'attended', source: 'api' }) })
    );
  });

  it('does nothing for an event kind the API cannot observe', async () => {
    const { service, prisma } = createService();

    prisma.clanEvent.findFirst.mockResolvedValue(clanEvent({ kind: 'training' }));

    await service.syncFromApi({ ...scope, id: 'e1' });

    expect(prisma.battle.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
