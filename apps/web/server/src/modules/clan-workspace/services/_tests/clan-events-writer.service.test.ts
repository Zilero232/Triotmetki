import { addHours, subHours, subMinutes } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';
import type { ClanAccessService } from '../clan-access.service';

import { AppBadRequestException, AppNotFoundException } from '../../../../common/exceptions';
import { CLAN_WORKSPACE } from '../../config/workspace.constants';
import { ClanEventsWriterService } from '../clan-events-writer.service';
import { clanEvent, endsAt, scope, startsAt, withAttendance } from './clan-events.fixtures';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const access = mock<ClanAccessService>();

  access.officer.mockResolvedValue({ accountId: 1n, role: 'commander', isOfficer: true });
  access.nicknames.mockResolvedValue(new Map());

  return { service: new ClanEventsWriterService(prisma, access), prisma };
};

describe('ClanEventsWriterService.create', () => {
  it('rejects an event that ends before it starts', async () => {
    const { service, prisma } = createService();

    await expect(
      service.create({
        ...scope,
        kind: 'stronghold',
        title: 'Stronghold',
        startsAt: startsAt.toISOString(),
        endsAt: subHours(startsAt, 1).toISOString()
      })
    ).rejects.toBeInstanceOf(AppBadRequestException);

    expect(prisma.clanEvent.create).not.toHaveBeenCalled();
  });

  it('schedules the reminder the configured lead time before the start', async () => {
    const { service, prisma } = createService();

    prisma.clanEvent.create.mockResolvedValue(withAttendance);

    await service.create({ ...scope, kind: 'stronghold', title: 'Stronghold', startsAt: startsAt.toISOString() });

    expect(prisma.clanEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          remindAt: subMinutes(startsAt, CLAN_WORKSPACE.reminderLeadMinutes),
          endsAt: addHours(startsAt, CLAN_WORKSPACE.defaultEventHours)
        })
      })
    );
  });
});

describe('ClanEventsWriterService.find', () => {
  it('refuses an event of another clan', async () => {
    const { service, prisma } = createService();

    prisma.clanEvent.findFirst.mockResolvedValue(null);

    await expect(service.find({ ...scope, id: 'e1' })).rejects.toBeInstanceOf(AppNotFoundException);
  });
});

describe('ClanEventsWriterService.update', () => {
  const lead = CLAN_WORKSPACE.reminderLeadMinutes;
  const reminded = clanEvent({ remindAt: subMinutes(startsAt, lead), remindedAt: subMinutes(startsAt, lead) });

  const editService = () => {
    const created = createService();

    created.prisma.clanEvent.findFirst.mockResolvedValue(reminded);
    created.prisma.clanEvent.findUniqueOrThrow.mockResolvedValue(withAttendance);

    return created;
  };

  const savedData = (prisma: ReturnType<typeof createService>['prisma']) => prisma.clanEvent.update.mock.calls[0]?.[0]?.data;

  it('moves the reminder with the event and re-arms it', async () => {
    const { service, prisma } = editService();
    const later = addHours(startsAt, 3);

    await service.update({ ...scope, id: 'e1', startsAt: later.toISOString(), endsAt: addHours(later, 1).toISOString() });

    expect(savedData(prisma)).toMatchObject({ startsAt: later, remindAt: subMinutes(later, lead), remindedAt: null });
  });

  it('keeps a sent reminder when nothing about its time changes', async () => {
    const { service, prisma } = editService();

    await service.update({ ...scope, id: 'e1', title: 'Renamed' });

    expect(savedData(prisma)).not.toHaveProperty('remindedAt');
  });

  it('applies a new lead time to the current start', async () => {
    const { service, prisma } = editService();

    await service.update({ ...scope, id: 'e1', remindMinutesBefore: lead * 2 });

    expect(savedData(prisma)).toMatchObject({ remindAt: subMinutes(startsAt, lead * 2), remindedAt: null });
  });

  it('refuses a start moved past the stored end', async () => {
    const { service, prisma } = editService();

    await expect(service.update({ ...scope, id: 'e1', startsAt: addHours(endsAt, 1).toISOString() })).rejects.toBeInstanceOf(AppBadRequestException);

    expect(prisma.clanEvent.update).not.toHaveBeenCalled();
  });
});
