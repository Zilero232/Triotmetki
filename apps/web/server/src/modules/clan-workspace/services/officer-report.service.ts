import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { ClanScope, ReportWindow, WeeklyReportView } from '../clan-workspace.types';

import { isoDay, weekWindow } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { NotificationService } from '../../notifications';
import { CLAN_WORKSPACE } from '../config/workspace.constants';
import { weeklyReport } from '../lib/weekly-report/weekly-report';
import { ClanAccessService } from './clan-access.service';

@Injectable()
export class OfficerReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClanAccessService,
    private readonly notifications: NotificationService
  ) {}

  async forOfficer({ clanId, userId }: ClanScope): Promise<WeeklyReportView> {
    await this.access.officer({ clanId, userId });

    return this.build({ clanId: BigInt(clanId), now: new Date() });
  }

  async sendWeekly(now: Date): Promise<number> {
    const workspaces = await this.prisma.clanWorkspace.findMany({ select: { clanId: true, clan: { select: { tag: true } } } });
    const weekKey = isoDay(weekWindow(now).weekStart);

    for (const workspace of workspaces) {
      const report = await this.build({ clanId: workspace.clanId, now });
      const userIds = await this.access.userIdsOf({ clanId: workspace.clanId, officersOnly: true });

      await this.notifications.notifyMany({
        userIds,
        dedupeKey: `clan-report-${workspace.clanId}-${weekKey}`,
        notification: {
          event: 'clanWeeklyReport',
          clanId: Number(workspace.clanId),
          clanTag: workspace.clan.tag,
          from: report.from,
          report: {
            events: report.events,
            attendanceRate: report.attendanceRate,
            newCandidates: report.newCandidates,
            inactiveMembers: report.inactiveMembers
          }
        }
      });
    }

    return workspaces.length;
  }

  async build({ clanId, now }: ReportWindow): Promise<WeeklyReportView> {
    const from = subDays(now, CLAN_WORKSPACE.reportDays);
    const inactiveBefore = subDays(now, CLAN_WORKSPACE.inactiveDays);
    const [events, attendance, newCandidates, inactiveMembers] = await Promise.all([
      this.prisma.clanEvent.count({ where: { clanId, startsAt: { gte: from, lt: now } } }),
      this.prisma.clanAttendance.findMany({ where: { event: { clanId, startsAt: { gte: from, lt: now } } }, select: { status: true } }),
      this.prisma.recruitCandidate.count({ where: { clanId, createdAt: { gte: from } } }),
      this.prisma.clanMember.count({ where: { clanId, player: { OR: [{ lastBattleAt: null }, { lastBattleAt: { lt: inactiveBefore } }] } } })
    ]);

    const report = weeklyReport({ events, attendance: attendance.map((row) => row.status), newCandidates, inactiveMembers });

    return { clanId: Number(clanId), from: from.toISOString(), to: now.toISOString(), ...report };
  }
}
