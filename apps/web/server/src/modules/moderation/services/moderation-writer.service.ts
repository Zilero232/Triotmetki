import { Injectable } from '@nestjs/common';
import { match } from 'ts-pattern';

import type { ReportStatus } from '../../../../generated';
import type { GuideView } from '../../guides';
import type { ContentReportView, CreateReportRequest, HideTargetInput, ModerateInput, ResolveReportRequest } from '../moderation.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { toJsonValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { GUIDE_INCLUDE, toGuideView } from '../../guides';
import { MODERATION } from '../config/moderation.constants';
import { toReportView } from '../mappers/report-view.mappers';

@Injectable()
export class ModerationWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async report({ userId, targetType, targetId, reason, details }: CreateReportRequest): Promise<ContentReportView> {
    const report = await this.prisma.contentReport.create({
      data: { reporterUserId: userId, targetType, targetId, reason, details: details ?? null }
    });

    return toReportView(report);
  }

  async reports(status: ReportStatus): Promise<ContentReportView[]> {
    const rows = await this.prisma.contentReport.findMany({ where: { status }, orderBy: { createdAt: 'asc' }, take: MODERATION.pageLimit });

    return rows.map(toReportView);
  }

  async resolve({ id, userId, status, hideTarget }: ResolveReportRequest): Promise<ContentReportView> {
    const report = await this.prisma.contentReport.findUnique({ where: { id } });

    if (!report) {
      throw new AppNotFoundException('NOT_FOUND', `No report ${id}`);
    }

    const resolvedAt = new Date();
    const updated = await this.prisma.$transaction(async (db) => {
      if (hideTarget) {
        await this.hide({ db, targetType: report.targetType, targetId: report.targetId });
      }

      const resolved = await db.contentReport.update({ where: { id }, data: { status, resolvedBy: userId, resolvedAt } });

      await db.contentReport.updateMany({
        where: { targetType: report.targetType, targetId: report.targetId, status: 'open', id: { not: id } },
        data: { status, resolvedBy: userId, resolvedAt }
      });

      await db.auditLog.create({
        data: {
          actorUserId: userId,
          action: `report.${status}`,
          entityType: report.targetType,
          entityId: report.targetId,
          metadata: toJsonValue({ reportId: id, hideTarget })
        }
      });

      return resolved;
    });

    return toReportView(updated);
  }

  async moderate({ target, id, status }: ModerateInput): Promise<void> {
    const data = { status };
    const { count } = await match(target)
      .with('build', () => this.prisma.build.updateMany({ where: { id }, data }))
      .with('comment', () => this.prisma.comment.updateMany({ where: { id }, data }))
      .with('guide', () =>
        this.prisma.guide.updateMany({ where: { id }, data: { ...data, ...(status === 'published' ? { publishedAt: new Date() } : {}) } })
      )
      .exhaustive();

    if (count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No ${target} ${id}`);
    }
  }

  async pendingGuides(): Promise<GuideView[]> {
    const rows = await this.prisma.guide.findMany({
      where: { status: 'pending' },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: MODERATION.pageLimit,
      include: GUIDE_INCLUDE
    });

    return rows.map((guide) => toGuideView({ guide, author: guide.author, likedByMe: false }));
  }

  private async hide({ db, targetType, targetId }: HideTargetInput): Promise<void> {
    await match(targetType)
      .with('build', () => db.build.updateMany({ where: { id: targetId }, data: { status: 'hidden' } }))
      .with('guide', () => db.guide.updateMany({ where: { id: targetId }, data: { status: 'hidden' } }))
      .with('comment', () => db.comment.updateMany({ where: { id: targetId }, data: { status: 'hidden' } }))
      .with('replay', () => db.replay.updateMany({ where: { id: targetId }, data: { visibility: 'private', hiddenAt: new Date() } }))
      .with('platoon_post', () => db.platoonPost.updateMany({ where: { id: targetId }, data: { status: 'hidden' } }))
      .with('recruiting_post', () => db.recruitingPost.updateMany({ where: { id: targetId }, data: { status: 'hidden' } }))
      .with('coach', () => db.coachProfile.updateMany({ where: { userId: targetId }, data: { isActive: false, hiddenAt: new Date() } }))
      .with('tournament', () => db.tournament.updateMany({ where: { id: targetId }, data: { status: 'cancelled' } }))
      .with('tactic_board', () => db.tacticBoard.updateMany({ where: { id: targetId }, data: { visibility: 'private', hiddenAt: new Date() } }))
      .with('streamer_profile', () => db.streamerProfile.updateMany({ where: { id: targetId }, data: { hiddenAt: new Date(), isLive: false } }))
      .otherwise(() => ({ count: 0 }));
  }
}
