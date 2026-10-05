import { Injectable } from '@nestjs/common';

import type { Build, Prisma } from '../../../../generated';
import type { IdViewer, LikeInput, LikeResult, OwnedById } from '../../community-core';
import type {
  BuildPage,
  BuildsQuery,
  BuildView,
  BuildViewInput,
  BuildViewsInput,
  CreateBuildRequest,
  PopularBuildsInput,
  UpdateBuildRequest
} from '../community-builds.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { paginate, toJsonValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { BUILD_SHARE } from '../config/build-share.constants';
import { toBuildView } from '../mappers/build-view.mappers';
import { BUILD_INCLUDE } from '../selects/build.selects';

@Injectable()
export class BuildShareWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ tankId, sort, limit, offset, viewerUserId }: BuildsQuery): Promise<BuildPage> {
    const where: Prisma.BuildWhereInput = { ...BUILD_SHARE.publicWhere, ...(tankId === undefined ? {} : { tankId }) };
    const orderBy = [...BUILD_SHARE.order[sort]];

    const page = await paginate({
      limit,
      offset,
      fetch: (window) => this.prisma.build.findMany({ where, orderBy, include: BUILD_INCLUDE, ...window }),
      count: () => this.prisma.build.count({ where })
    });

    return { ...page, items: await this.views({ rows: page.items, viewerUserId }) };
  }

  async popular({ tankId, viewerUserId }: PopularBuildsInput): Promise<BuildView[]> {
    const rows = await this.prisma.build.findMany({
      where: { ...BUILD_SHARE.publicWhere, tankId },
      orderBy: [...BUILD_SHARE.order.popular],
      take: BUILD_SHARE.popularLimit,
      include: BUILD_INCLUDE
    });

    return this.views({ rows, viewerUserId });
  }

  async get({ id, viewerUserId }: IdViewer): Promise<BuildView> {
    const build = await this.prisma.build.findUnique({ where: { id }, include: BUILD_INCLUDE });

    if (!build || (build.authorUserId !== viewerUserId && (build.visibility === 'private' || build.status !== 'published'))) {
      throw new AppNotFoundException('NOT_FOUND', `No build ${id}`);
    }

    return this.view({ row: build, viewerUserId });
  }

  async create({ userId, tankId, title, description, loadout, visibility }: CreateBuildRequest): Promise<BuildView> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { tankId }, select: { tankId: true } });

    if (!vehicle) {
      throw new AppNotFoundException('TANK_NOT_FOUND', `No tank ${tankId}`);
    }

    const current = await this.prisma.gameVersion.findFirst({ where: { isCurrent: true }, select: { id: true } });
    const build = await this.prisma.build.create({
      data: {
        authorUserId: userId,
        tankId,
        title,
        description: description ?? null,
        loadout: toJsonValue(loadout),
        visibility,
        gameVersionId: current?.id ?? null
      },
      include: BUILD_INCLUDE
    });

    return this.view({ row: build, viewerUserId: userId });
  }

  async update({ id, userId, title, description, loadout, visibility }: UpdateBuildRequest): Promise<BuildView> {
    await this.owned({ id, userId });

    const build = await this.prisma.build.update({
      where: { id },
      data: {
        ...(title === undefined ? {} : { title }),
        ...(description === undefined ? {} : { description }),
        ...(loadout === undefined ? {} : { loadout: toJsonValue(loadout) }),
        ...(visibility === undefined ? {} : { visibility })
      },
      include: BUILD_INCLUDE
    });

    return this.view({ row: build, viewerUserId: userId });
  }

  async remove({ id, userId }: OwnedById): Promise<void> {
    await this.owned({ id, userId });

    await this.prisma.$transaction([
      this.prisma.reaction.deleteMany({ where: { target: 'build', targetId: id } }),
      this.prisma.comment.deleteMany({ where: { target: 'build', targetId: id } }),
      this.prisma.build.delete({ where: { id } })
    ]);
  }

  async like({ id, userId, liked }: LikeInput): Promise<LikeResult> {
    await this.get({ id, viewerUserId: userId });

    return this.prisma.$transaction(async (tx) => {
      const changed = liked
        ? await tx.reaction.createMany({ data: [{ target: 'build', targetId: id, userId }], skipDuplicates: true })
        : await tx.reaction.deleteMany({ where: { target: 'build', targetId: id, userId } });

      if (changed.count > 0) {
        await tx.build.update({ where: { id }, data: { likesCount: liked ? { increment: 1 } : { decrement: 1 } } });
      }

      const build = await tx.build.findUniqueOrThrow({ where: { id }, select: { likesCount: true } });

      return { liked, likesCount: Math.max(0, build.likesCount) };
    });
  }

  private async owned({ id, userId }: OwnedById): Promise<Build> {
    const build = await this.prisma.build.findFirst({ where: { id, authorUserId: userId } });

    return build ?? this.notFound(id);
  }

  private async views({ rows, viewerUserId }: BuildViewsInput): Promise<BuildView[]> {
    const liked = viewerUserId
      ? await this.prisma.reaction.findMany({
          where: { target: 'build', userId: viewerUserId, targetId: { in: rows.map((row) => row.id) } },
          select: { targetId: true }
        })
      : [];

    const likedIds = new Set(liked.map((like) => like.targetId));

    return rows.map((build) =>
      toBuildView({ build, author: build.author, likedByMe: likedIds.has(build.id), gameVersion: build.gameVersion?.version ?? null })
    );
  }

  private async view({ row, viewerUserId }: BuildViewInput): Promise<BuildView> {
    const [view] = await this.views({ rows: [row], viewerUserId });

    return view ?? this.notFound(row.id);
  }

  private notFound(id: string): never {
    throw new AppNotFoundException('NOT_FOUND', `No build ${id}`);
  }
}
