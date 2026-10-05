import { Injectable } from '@nestjs/common';
import { addDays } from 'date-fns';

import type { Prisma, RecruitingPost } from '../../../../generated';
import type { OwnedById } from '../../community-core';
import type { CanCloseInput, CreateRecruitingRequest, RecruitingPage, RecruitingQuery, RecruitingView } from '../recruiting.types';

import { AppBadRequestException, AppForbiddenException, AppNotFoundException } from '../../../common/exceptions';
import { paginate, toJsonValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { CommunityAccountsReaderService } from '../../community-core';
import { isRecruitingOfficer } from '../lib/clan-officer/clan-officer';
import { toRecruitingView } from '../mappers/recruiting-view.mappers';

@Injectable()
export class RecruitingWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: CommunityAccountsReaderService
  ) {}

  async list({ kind, clanId, limit, offset }: RecruitingQuery): Promise<RecruitingPage> {
    const now = new Date();
    const where: Prisma.RecruitingPostWhereInput = {
      status: 'open',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(kind ? { kind } : {}),
      ...(clanId === undefined ? {} : { clanId: BigInt(clanId) })
    };

    const page = await paginate({
      limit,
      offset,
      fetch: (window) => this.prisma.recruitingPost.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...window }),
      count: () => this.prisma.recruitingPost.count({ where })
    });

    return { ...page, items: await this.views(page.items) };
  }

  async create({ userId, kind, clanId, accountId, title, body, requirements, expiresInDays }: CreateRecruitingRequest): Promise<RecruitingView> {
    const account = await this.accounts.accountOf({ userId, accountId });
    let postClanId: bigint | null = null;

    if (kind === 'clanSeeksPlayer') {
      if (clanId === undefined) {
        throw new AppBadRequestException('VALIDATION_FAILED', 'A clan post needs clanId');
      }

      const member = await this.prisma.clanMember.findUnique({ where: { accountId: account }, select: { clanId: true, role: true } });

      if (!member || member.clanId !== BigInt(clanId) || !isRecruitingOfficer(member.role)) {
        throw new AppForbiddenException('FORBIDDEN', 'Only clan officers can recruit for the clan');
      }

      postClanId = member.clanId;
    }

    const post = await this.prisma.recruitingPost.create({
      data: {
        kind,
        clanId: postClanId,
        accountId: kind === 'playerSeeksClan' ? account : null,
        authorUserId: userId,
        title,
        body,
        requirements: toJsonValue(requirements),
        expiresAt: addDays(new Date(), expiresInDays)
      }
    });

    const [view] = await this.views([post]);

    if (!view) {
      throw new AppNotFoundException('NOT_FOUND', 'The post disappeared');
    }

    return view;
  }

  async close({ id, userId }: OwnedById): Promise<void> {
    const post = await this.prisma.recruitingPost.findFirst({
      where: { id, status: 'open' },
      select: { authorUserId: true, clanId: true, accountId: true }
    });

    if (!post || !(await this.canClose({ post, userId }))) {
      throw new AppNotFoundException('NOT_FOUND', `No open recruiting post ${id} you can close`);
    }

    await this.prisma.recruitingPost.updateMany({ where: { id, status: 'open' }, data: { status: 'closed' } });
  }

  async expire(now: Date): Promise<number> {
    const { count } = await this.prisma.recruitingPost.updateMany({
      where: { status: 'open', expiresAt: { lte: now } },
      data: { status: 'expired' }
    });

    return count;
  }

  private async canClose({ post, userId }: CanCloseInput): Promise<boolean> {
    if (post.authorUserId === userId) {
      return true;
    }

    const links = await this.prisma.userLestaAccount.findMany({ where: { userId }, select: { accountId: true } });
    const accountIds = links.map((link) => link.accountId);

    if (post.accountId !== null) {
      return accountIds.includes(post.accountId);
    }

    if (post.clanId === null || accountIds.length === 0) {
      return false;
    }

    const members = await this.prisma.clanMember.findMany({ where: { accountId: { in: accountIds }, clanId: post.clanId }, select: { role: true } });

    return members.some((member) => isRecruitingOfficer(member.role));
  }

  private async views(rows: RecruitingPost[]): Promise<RecruitingView[]> {
    const accountIds = rows.flatMap((row) => (row.accountId === null ? [] : [row.accountId]));
    const clanIds = rows.flatMap((row) => (row.clanId === null ? [] : [row.clanId]));
    const [stats, nicknames, clans] = await Promise.all([
      this.accounts.statsOf(accountIds),
      this.accounts.nicknamesOf(accountIds),
      clanIds.length === 0 ? [] : this.prisma.clan.findMany({ where: { clanId: { in: clanIds } }, select: { clanId: true, tag: true } })
    ]);

    const clanTags = new Map(clans.map((clan) => [clan.clanId, clan.tag]));

    return rows.map((post) => toRecruitingView({ post, stats, nicknames, clanTags }));
  }
}
