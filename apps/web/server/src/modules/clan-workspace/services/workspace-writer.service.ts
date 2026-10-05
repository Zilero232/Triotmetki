import { Injectable } from '@nestjs/common';

import type { ClanScope, WorkspaceView } from '../clan-workspace.types';

import { AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../common/exceptions';
import { isUniqueViolation, PrismaService } from '../../../core';
import { CLAN_WORKSPACE } from '../config/workspace.constants';
import { canOwnWorkspace } from '../lib/workspace-roles/workspace-roles';
import { toClanEventView } from '../mappers/clan-event.mappers';
import { ClanAccessService } from './clan-access.service';

@Injectable()
export class WorkspaceWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClanAccessService
  ) {}

  async create({ clanId, userId }: ClanScope): Promise<WorkspaceView> {
    const membership = await this.access.membership({ clanId, userId });

    if (!canOwnWorkspace(membership.role)) {
      throw new AppForbiddenException('FORBIDDEN', 'Only the commander or the executive officer can open the workspace');
    }

    try {
      await this.prisma.clanWorkspace.create({ data: { clanId: BigInt(clanId), ownerUserId: userId } });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppConflictException('CONFLICT', 'The clan already has a workspace');
      }

      throw error;
    }

    return this.get({ clanId, userId });
  }

  async get({ clanId, userId }: ClanScope): Promise<WorkspaceView> {
    const membership = await this.access.member({ clanId, userId });
    const id = BigInt(clanId);
    const [clan, workspace, upcoming, candidates] = await Promise.all([
      this.prisma.clan.findUnique({ where: { clanId: id }, select: { tag: true, name: true, membersCount: true } }),
      this.access.workspace(clanId),
      this.prisma.clanEvent.findMany({
        where: { clanId: id, startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        take: CLAN_WORKSPACE.upcomingEvents,
        include: { attendance: true }
      }),
      membership.isOfficer ? this.prisma.recruitCandidate.groupBy({ by: ['status'], where: { clanId: id }, _count: { _all: true } }) : []
    ]);

    if (!clan) {
      throw new AppNotFoundException('CLAN_NOT_FOUND', `No clan ${clanId}`);
    }

    const nicknames = await this.access.nicknames(upcoming.flatMap((event) => event.attendance.map((row) => row.accountId)));

    return {
      clanId,
      clanTag: clan.tag,
      clanName: clan.name,
      role: membership.isOfficer ? 'officer' : 'member',
      membersCount: clan.membersCount,
      upcoming: upcoming.map((event) => toClanEventView({ event, nicknames })),
      candidates: {
        sourced: 0,
        contacted: 0,
        trial: 0,
        accepted: 0,
        rejected: 0,
        ...Object.fromEntries(candidates.map((row) => [row.status, row._count._all]))
      },
      createdAt: workspace.createdAt.toISOString()
    };
  }
}
