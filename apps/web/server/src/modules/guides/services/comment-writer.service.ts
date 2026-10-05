import { Injectable } from '@nestjs/common';
import { match } from 'ts-pattern';

import type { OwnedById } from '../../community-core';
import type { CommentView, CreateCommentRequest, ListCommentsInput } from '../guides.types';

import { AppBadRequestException, AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { AUTHOR_SELECT } from '../../community-core';
import { COMMENTS } from '../config/guides.constants';
import { toCommentView } from '../mappers/guide-views.mappers';

@Injectable()
export class CommentWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ target, targetId, viewerUserId }: ListCommentsInput): Promise<CommentView[]> {
    if (!(await this.isTargetVisible({ target, targetId, viewerUserId }))) {
      throw new AppNotFoundException('NOT_FOUND', `No ${target} ${targetId}`);
    }

    const rows = await this.prisma.comment.findMany({
      where: { target, targetId, status: { in: ['published', 'hidden'] } },
      orderBy: { createdAt: 'desc' },
      take: COMMENTS.pageLimit,
      include: { author: { select: AUTHOR_SELECT } }
    });

    return rows.map(toCommentView).reverse();
  }

  async create({ userId, target, targetId, parentId, body }: CreateCommentRequest): Promise<CommentView> {
    if (!(await this.isTargetVisible({ target, targetId, viewerUserId: userId }))) {
      throw new AppNotFoundException('NOT_FOUND', `Nothing to comment at ${target} ${targetId}`);
    }

    if (parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: parentId }, select: { target: true, targetId: true } });

      if (!parent || parent.target !== target || parent.targetId !== targetId) {
        throw new AppBadRequestException('VALIDATION_FAILED', 'The parent comment belongs to another thread');
      }
    }

    const comment = await this.prisma.comment.create({
      data: { authorUserId: userId, target, targetId, parentId: parentId ?? null, body },
      include: { author: { select: AUTHOR_SELECT } }
    });

    return toCommentView(comment);
  }

  async remove({ id, userId }: OwnedById): Promise<void> {
    const { count } = await this.prisma.comment.updateMany({ where: { id, authorUserId: userId }, data: { status: 'hidden' } });

    if (count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No comment ${id} of yours`);
    }
  }

  private async isTargetVisible({ target, targetId, viewerUserId }: ListCommentsInput): Promise<boolean> {
    const isUuid = COMMENTS.targetIdPattern.test(targetId);

    if (!isUuid) {
      return false;
    }

    const select = { id: true } as const;
    const owned = <T>(where: T): T[] => (viewerUserId ? [where] : []);
    const found = await match(target)
      .with('build', () =>
        this.prisma.build.findFirst({
          where: { id: targetId, OR: [{ status: 'published', visibility: { not: 'private' } }, ...owned({ authorUserId: viewerUserId ?? '' })] },
          select
        })
      )
      .with('guide', () =>
        this.prisma.guide.findFirst({
          where: { id: targetId, OR: [{ status: 'published' }, ...owned({ authorUserId: viewerUserId ?? '' })] },
          select
        })
      )
      .with('replay', () =>
        this.prisma.replay.findFirst({
          where: { id: targetId, OR: [{ visibility: { not: 'private' } }, ...owned({ uploaderUserId: viewerUserId ?? '' })] },
          select
        })
      )
      .with('tacticBoard', () =>
        this.prisma.tacticBoard.findFirst({
          where: { id: targetId, OR: [{ visibility: { not: 'private' } }, ...owned({ ownerUserId: viewerUserId ?? '' })] },
          select
        })
      )
      .exhaustive();

    return found !== null;
  }
}
