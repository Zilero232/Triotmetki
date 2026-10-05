import { Injectable } from '@nestjs/common';
import { unique } from 'remeda';

import type { ClanRecipientsInput, ClanScope, Membership } from '../clan-workspace.types';

import { AppForbiddenException, AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { isClanOfficer } from '../lib/workspace-roles/workspace-roles';

@Injectable()
export class ClanAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async membership({ clanId, userId }: ClanScope): Promise<Membership> {
    const links = await this.prisma.userLestaAccount.findMany({ where: { userId }, select: { accountId: true } });
    const members = await this.prisma.clanMember.findMany({
      where: { clanId: BigInt(clanId), accountId: { in: links.map((link) => link.accountId) } },
      select: { accountId: true, role: true }
    });

    const best = members.find((member) => isClanOfficer(member.role)) ?? members[0];

    if (!best) {
      throw new AppForbiddenException('FORBIDDEN', 'Your linked Lesta ID accounts are not in this clan');
    }

    return { accountId: best.accountId, role: best.role, isOfficer: isClanOfficer(best.role) };
  }

  async officer(scope: ClanScope): Promise<Membership> {
    const membership = await this.membership(scope);

    if (!membership.isOfficer) {
      throw new AppForbiddenException('FORBIDDEN', 'Only clan officers can do this');
    }

    await this.workspace(scope.clanId);

    return membership;
  }

  async member(scope: ClanScope): Promise<Membership> {
    const membership = await this.membership(scope);

    await this.workspace(scope.clanId);

    return membership;
  }

  async workspace(clanId: number) {
    const workspace = await this.prisma.clanWorkspace.findUnique({ where: { clanId: BigInt(clanId) } });

    if (!workspace) {
      throw new AppNotFoundException('NOT_FOUND', `Clan ${clanId} has no workspace yet`);
    }

    return workspace;
  }

  async nicknames(accountIds: readonly bigint[]): Promise<Map<bigint, string>> {
    const players =
      accountIds.length === 0
        ? []
        : await this.prisma.player.findMany({ where: { accountId: { in: unique(accountIds) } }, select: { accountId: true, nickname: true } });

    return new Map(players.map((player) => [player.accountId, player.nickname]));
  }

  async userIdsOf({ clanId, officersOnly }: ClanRecipientsInput): Promise<string[]> {
    const members = await this.prisma.clanMember.findMany({ where: { clanId }, select: { accountId: true, role: true } });
    const accountIds = members.filter((member) => !officersOnly || isClanOfficer(member.role)).map((member) => member.accountId);
    const links =
      accountIds.length === 0
        ? []
        : await this.prisma.userLestaAccount.findMany({ where: { accountId: { in: accountIds } }, select: { userId: true } });

    return unique(links.map((link) => link.userId));
  }
}
