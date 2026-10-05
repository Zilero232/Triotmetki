import { addDays, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ClanAttendance, ClanWorkspace } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { NotificationService } from '../../../notifications';
import type { ClanAccessService } from '../clan-access.service';

import { CLAN_WORKSPACE } from '../../config/workspace.constants';
import { OfficerReportService } from '../officer-report.service';

const now = new Date('2026-09-23T10:00:00Z');
const weekKey = '2026-09-21';

const workspace = (clanId: bigint, tag: string): ClanWorkspace & { clan: { tag: string } } => ({
  clanId,
  ownerUserId: 'u1',
  settings: null,
  createdAt: now,
  updatedAt: now,
  clan: { tag }
});

const attendance = (status: ClanAttendance['status']): ClanAttendance => ({
  eventId: 'e1',
  accountId: 1n,
  status,
  source: 'api',
  updatedAt: now
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const access = mock<ClanAccessService>();
  const notifications = mock<NotificationService>();

  prisma.clanWorkspace.findMany.mockResolvedValue([workspace(100n, 'BRNV'), workspace(200n, 'TANK')]);
  prisma.clanEvent.count.mockResolvedValue(3);
  prisma.clanAttendance.findMany.mockResolvedValue([attendance('attended'), attendance('absent'), attendance('confirmed')]);
  prisma.recruitCandidate.count.mockResolvedValue(2);
  prisma.clanMember.count.mockResolvedValue(5);
  access.userIdsOf.mockResolvedValue(['officer']);

  return { service: new OfficerReportService(prisma, access, notifications), prisma, access, notifications };
};

describe('OfficerReportService.sendWeekly', () => {
  it('sends every workspace report to its officers only', async () => {
    const { service, access } = createService();

    expect(await service.sendWeekly(now)).toBe(2);
    expect(access.userIdsOf).toHaveBeenCalledWith({ clanId: 100n, officersOnly: true });
    expect(access.userIdsOf).toHaveBeenCalledWith({ clanId: 200n, officersOnly: true });
  });

  it('carries the weekly figures in the notification payload', async () => {
    const { service, notifications } = createService();

    await service.sendWeekly(now);

    expect(notifications.notifyMany).toHaveBeenCalledWith({
      userIds: ['officer'],
      dedupeKey: `clan-report-100-${weekKey}`,
      notification: expect.objectContaining({
        event: 'clanWeeklyReport',
        clanId: 100,
        clanTag: 'BRNV',
        from: subDays(now, CLAN_WORKSPACE.reportDays).toISOString(),
        report: { events: 3, attendanceRate: 0.5, newCandidates: 2, inactiveMembers: 5 }
      })
    });
  });

  it('keys each report by clan and week so a rerun is deduplicated', async () => {
    const { service, notifications } = createService();

    await service.sendWeekly(now);
    await service.sendWeekly(addDays(now, 3));

    const keys = notifications.notifyMany.mock.calls.map(([input]) => input.dedupeKey);

    expect(new Set(keys)).toEqual(new Set([`clan-report-100-${weekKey}`, `clan-report-200-${weekKey}`]));
  });
});
