import type { MissionCampaigns, MissionOperationParams, MissionOperation as MissionOperationView, VehicleSummary } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { MissionContext, MissionVersion, OperationLookup, OperationRows } from '../missions.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { toBranchView, toCampaignView, toOperationSummary } from '../mappers/mission.mappers';

@Injectable()
export class MissionCatalogReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async currentVersion(): Promise<MissionVersion | null> {
    const row = await this.prisma.missionCampaign.findFirst({
      where: { gameVersion: { isTest: false } },
      orderBy: [{ gameVersion: { isCurrent: 'desc' } }, { gameVersionId: 'desc' }],
      select: { gameVersion: { select: { id: true, version: true } } }
    });

    return row?.gameVersion ?? null;
  }

  async campaigns(): Promise<MissionCampaigns> {
    const version = await this.currentVersion();

    if (!version) {
      return { gameVersion: null, campaigns: [] };
    }

    const [campaigns, operations, branchCounts, missionIds] = await Promise.all([
      this.prisma.missionCampaign.findMany({ where: { gameVersionId: version.id }, orderBy: { campaignId: 'asc' } }),
      this.prisma.missionOperation.findMany({ where: { gameVersionId: version.id }, orderBy: { operationId: 'asc' } }),
      this.prisma.missionBranch.groupBy({ by: ['operationId'], where: { gameVersionId: version.id }, _count: { _all: true } }),
      this.prisma.mission.findMany({
        where: { gameVersionId: version.id },
        select: { operationId: true, questId: true },
        orderBy: { questId: 'asc' }
      })
    ]);

    const branchesOf = new Map(branchCounts.map((row) => [row.operationId, row._count._all]));
    const questIdsOf = (operationId: number) => missionIds.filter((row) => row.operationId === operationId).map((row) => row.questId);
    const summaries = await Promise.all(
      operations.map(async (operation) =>
        toOperationSummary({
          operation,
          reward: await this.reward(operation.rewardTankId),
          branchesCount: branchesOf.get(operation.operationId) ?? 0,
          questIds: questIdsOf(operation.operationId)
        })
      )
    );

    return {
      gameVersion: version.version,
      campaigns: await Promise.all(
        campaigns.map(async (campaign) => ({
          ...toCampaignView({ campaign, reward: await this.reward(campaign.rewardTankId) }),
          operations: summaries.filter((summary) => summary.campaignId === campaign.campaignId)
        }))
      )
    };
  }

  async operation({ campaign, operation }: MissionOperationParams): Promise<MissionOperationView> {
    const version = await this.requireVersion();
    const rows = await this.operationRows({ gameVersionId: version, campaignId: campaign, operationId: operation });
    const campaignRow = await this.prisma.missionCampaign.findUnique({
      where: { gameVersionId_campaignId: { gameVersionId: version, campaignId: campaign } }
    });

    if (!campaignRow) {
      throw new AppNotFoundException('NOT_FOUND', `No campaign ${campaign}`);
    }

    return {
      campaign: toCampaignView({ campaign: campaignRow, reward: await this.reward(campaignRow.rewardTankId) }),
      operation: toOperationSummary({
        operation: rows.operation,
        reward: await this.reward(rows.operation.rewardTankId),
        branchesCount: rows.branches.length,
        questIds: rows.missions.map((mission) => mission.questId)
      }),
      branches: rows.branches.map((branch) =>
        toBranchView({ branch, missions: rows.missions.filter((mission) => mission.chainId === branch.chainId) })
      )
    };
  }

  async operationRows({ gameVersionId, campaignId, operationId }: OperationLookup): Promise<OperationRows> {
    const operation = await this.prisma.missionOperation.findUnique({ where: { gameVersionId_operationId: { gameVersionId, operationId } } });

    if (!operation || operation.campaignId !== campaignId) {
      throw new AppNotFoundException('NOT_FOUND', `No operation ${campaignId}/${operationId}`);
    }

    const [branches, missions] = await Promise.all([
      this.prisma.missionBranch.findMany({ where: { gameVersionId, operationId }, orderBy: { chainId: 'asc' } }),
      this.prisma.mission.findMany({ where: { gameVersionId, operationId }, orderBy: [{ chainId: 'asc' }, { position: 'asc' }] })
    ]);

    return { operation, branches, missions };
  }

  async operationById(operationId: number): Promise<OperationRows> {
    const gameVersionId = await this.requireVersion();
    const operation = await this.prisma.missionOperation.findUnique({ where: { gameVersionId_operationId: { gameVersionId, operationId } } });

    if (!operation) {
      throw new AppNotFoundException('NOT_FOUND', `No operation ${operationId}`);
    }

    return this.operationRows({ gameVersionId, campaignId: operation.campaignId, operationId });
  }

  async mission(questId: number): Promise<MissionContext> {
    const gameVersionId = await this.requireVersion();
    const mission = await this.prisma.mission.findUnique({ where: { gameVersionId_questId: { gameVersionId, questId } }, include: { branch: true } });

    if (!mission) {
      throw new AppNotFoundException('NOT_FOUND', `No mission ${questId}`);
    }

    const { branch, ...row } = mission;

    return { mission: row, branch };
  }

  private async requireVersion(): Promise<number> {
    const version = await this.currentVersion();

    if (!version) {
      throw new AppNotFoundException('NOT_FOUND', 'Personal missions are not imported yet');
    }

    return version.id;
  }

  private async reward(tankId: number | null): Promise<VehicleSummary | null> {
    if (tankId === null) {
      return null;
    }

    return (await this.catalog.find(tankId))?.summary ?? null;
  }
}
