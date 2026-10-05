import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import type { Prisma } from '../../../../generated';
import type { LikeInput, LikeResult, OwnedById } from '../../community-core';
import type {
  CreateGuideRequest,
  GuideAuthor,
  GuideBySlugInput,
  GuidePage,
  GuidesQuery,
  GuideView,
  GuideViewsInput,
  UpdateGuideRequest
} from '../guides.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { paginate } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { AUTHOR_SELECT, titleSlug, toAuthorView } from '../../community-core';
import { GUIDES } from '../config/guides.constants';
import { toGuideView } from '../mappers/guide-views.mappers';
import { GUIDE_INCLUDE } from '../selects/guide.selects';

@Injectable()
export class GuideWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ kind, tankId, arenaId, sort, limit, offset, viewerUserId }: GuidesQuery): Promise<GuidePage> {
    const where: Prisma.GuideWhereInput = {
      status: 'published',
      ...(kind ? { kind } : {}),
      ...(tankId === undefined ? {} : { tankId }),
      ...(arenaId ? { arenaId } : {})
    };

    const orderBy: Prisma.GuideOrderByWithRelationInput[] =
      sort === 'popular' ? [{ likesCount: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }] : [{ publishedAt: 'desc' }, { id: 'desc' }];

    const page = await paginate({
      limit,
      offset,
      fetch: (window) => this.prisma.guide.findMany({ where, orderBy, include: GUIDE_INCLUDE, ...window }),
      count: () => this.prisma.guide.count({ where })
    });

    return { ...page, items: await this.views({ rows: page.items, viewerUserId }) };
  }

  async bySlug({ slug, viewerUserId }: GuideBySlugInput): Promise<GuideView> {
    const guide = await this.prisma.guide.findUnique({ where: { slug }, include: GUIDE_INCLUDE });

    if (!guide || (guide.status !== 'published' && guide.authorUserId !== viewerUserId)) {
      throw new AppNotFoundException('NOT_FOUND', `No guide ${slug}`);
    }

    const [view] = await this.views({ rows: [guide], viewerUserId });

    if (!view) {
      throw new AppNotFoundException('NOT_FOUND', `No guide ${slug}`);
    }

    return view;
  }

  async mine(userId: string): Promise<GuideView[]> {
    const rows = await this.prisma.guide.findMany({
      where: { authorUserId: userId },
      orderBy: { updatedAt: 'desc' },
      take: GUIDES.mineLimit,
      include: GUIDE_INCLUDE
    });

    return this.views({ rows, viewerUserId: userId });
  }

  async create({ userId, kind, tankId, arenaId, locale, title, body }: CreateGuideRequest): Promise<GuideView> {
    const guide = await this.prisma.guide.create({
      data: {
        authorUserId: userId,
        slug: titleSlug({ title, suffix: randomBytes(3).toString('hex') }),
        kind,
        tankId: tankId ?? null,
        arenaId: arenaId ?? null,
        locale,
        title,
        body,
        status: 'pending'
      }
    });

    return this.bySlug({ slug: guide.slug, viewerUserId: userId });
  }

  async update({ id, userId, ...changes }: UpdateGuideRequest): Promise<GuideView> {
    const guide = await this.prisma.guide.findFirst({ where: { id, authorUserId: userId }, select: { slug: true, kind: true } });

    if (!guide) {
      throw new AppNotFoundException('NOT_FOUND', `No guide ${id} of yours`);
    }

    const isKindChanged = changes.kind !== undefined && changes.kind !== guide.kind;
    const subject = isKindChanged ? { tankId: changes.tankId ?? null, arenaId: changes.arenaId ?? null } : {};

    await this.prisma.guide.update({ where: { id }, data: { ...changes, ...subject, status: 'pending' } });

    return this.bySlug({ slug: guide.slug, viewerUserId: userId });
  }

  async remove({ id, userId }: OwnedById): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.guide.deleteMany({ where: { id, authorUserId: userId } });

      if (count === 0) {
        throw new AppNotFoundException('NOT_FOUND', `No guide ${id} of yours`);
      }

      await tx.reaction.deleteMany({ where: { target: 'guide', targetId: id } });
      await tx.comment.deleteMany({ where: { target: 'guide', targetId: id } });
    });
  }

  async like({ id, userId, liked }: LikeInput): Promise<LikeResult> {
    const guide = await this.prisma.guide.findFirst({ where: { id, status: 'published' }, select: { id: true } });

    if (!guide) {
      throw new AppNotFoundException('NOT_FOUND', `No guide ${id}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const changed = liked
        ? await tx.reaction.createMany({ data: [{ target: 'guide', targetId: id, userId }], skipDuplicates: true })
        : await tx.reaction.deleteMany({ where: { target: 'guide', targetId: id, userId } });

      if (changed.count > 0) {
        await tx.guide.update({ where: { id }, data: { likesCount: liked ? { increment: 1 } : { decrement: 1 } } });
      }

      const current = await tx.guide.findUniqueOrThrow({ where: { id }, select: { likesCount: true } });

      return { liked, likesCount: Math.max(0, current.likesCount) };
    });
  }

  async topAuthors(): Promise<GuideAuthor[]> {
    const grouped = await this.prisma.guide.groupBy({
      by: ['authorUserId'],
      where: { status: 'published' },
      _count: { _all: true },
      _sum: { likesCount: true },
      orderBy: { _sum: { likesCount: 'desc' } },
      take: GUIDES.authorsLimit
    });

    const users = await this.prisma.user.findMany({ where: { id: { in: grouped.map((row) => row.authorUserId) } }, select: AUTHOR_SELECT });

    return grouped.flatMap((row) => {
      const user = users.find((candidate) => candidate.id === row.authorUserId);

      return user ? [{ author: toAuthorView(user), guides: row._count._all, likes: row._sum.likesCount ?? 0 }] : [];
    });
  }

  private async views({ rows, viewerUserId }: GuideViewsInput): Promise<GuideView[]> {
    const liked = viewerUserId
      ? await this.prisma.reaction.findMany({
          where: { target: 'guide', userId: viewerUserId, targetId: { in: rows.map((row) => row.id) } },
          select: { targetId: true }
        })
      : [];

    const likedIds = new Set(liked.map((like) => like.targetId));

    return rows.map((guide) => toGuideView({ guide, author: guide.author, likedByMe: likedIds.has(guide.id) }));
  }
}
