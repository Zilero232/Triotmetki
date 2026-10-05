import type { MissionProgress } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { uniqueBy } from 'remeda';

import type { PlanProgress } from '../lib/mission-plan/mission-plan.types';
import type { NextMissions } from '../missions.types';

import { PrismaService } from '../../../core';
import { MISSION_PLAN } from '../config/plan.constants';
import { planOperation, toPlanBranches } from '../lib/mission-plan/mission-plan';
import { readConditions, toProgressItem } from '../mappers/mission.mappers';
import { MissionCatalogReaderService } from './mission-catalog-reader.service';

@Injectable()
export class MissionProgressReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: MissionCatalogReaderService
  ) {}

  async list(userId: string): Promise<MissionProgress> {
    const rows = await this.prisma.userMissionProgress.findMany({ where: { userId }, orderBy: { questId: 'asc' } });

    return { items: rows.map(toProgressItem) };
  }

  async progressMap(userId: string): Promise<Map<number, PlanProgress>> {
    const rows = await this.prisma.userMissionProgress.findMany({ where: { userId }, select: { questId: true, done: true, honors: true } });

    return new Map(rows.map((row) => [row.questId, { done: row.done, honors: row.honors }]));
  }

  async next(userId: string): Promise<NextMissions | null> {
    const version = await this.catalog.currentVersion();

    if (!version) {
      return null;
    }

    const latest = await this.prisma.userMissionProgress.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' }, select: { questId: true } });
    const anchor = latest
      ? await this.prisma.mission.findUnique({ where: { gameVersionId_questId: { gameVersionId: version.id, questId: latest.questId } } })
      : await this.prisma.mission.findFirst({ where: { gameVersionId: version.id }, orderBy: { questId: 'asc' } });

    if (!anchor) {
      return null;
    }

    const [rows, progress] = await Promise.all([this.catalog.operationById(anchor.operationId), this.progressMap(userId)]);
    const byQuest = new Map(rows.missions.map((mission) => [mission.questId, mission]));
    const steps = planOperation({
      branches: toPlanBranches(rows),
      progress
    });

    const firstPerBranch = uniqueBy(steps, (step) => step.chainId);

    return {
      operationName: rows.operation.name ?? `#${rows.operation.operationId}`,
      campaignId: rows.operation.campaignId,
      operationId: rows.operation.operationId,
      missions: firstPerBranch.slice(0, MISSION_PLAN.telegramNextLimit).map((step) => {
        const main = readConditions(byQuest.get(step.questId)?.conditions ?? null).find((condition) => condition.isMain && condition.description);

        return { branchKey: step.branchKey, title: step.title, condition: main?.description ?? null };
      })
    };
  }
}
