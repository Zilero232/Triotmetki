import type { MissionPlan, VehicleSummary } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { Mission } from '../../../../generated';
import type { UserOperationInput } from '../missions.types';

import { MISSION_TANKS } from '../config/suitable-tanks.constants';
import { planOperation, toPlanBranches } from '../lib/mission-plan/mission-plan';
import { rankTanks, toCandidate } from '../lib/tank-fit/tank-fit';
import { MissionCatalogReaderService } from './mission-catalog-reader.service';
import { MissionProgressReaderService } from './mission-progress-reader.service';
import { MissionTanksReaderService } from './mission-tanks-reader.service';

@Injectable()
export class MissionPlanReaderService {
  constructor(
    private readonly catalog: MissionCatalogReaderService,
    private readonly progress: MissionProgressReaderService,
    private readonly tanks: MissionTanksReaderService
  ) {}

  async plan({ userId, operationId }: UserOperationInput): Promise<MissionPlan> {
    const [rows, progress, garage] = await Promise.all([
      this.catalog.operationById(operationId),
      this.progress.progressMap(userId),
      this.tanks.garageTanks(userId)
    ]);

    const owned = new Set(garage.tanks.map((tank) => tank.tankId));
    const { rows: stats } = await this.tanks.serverStats({ tankIds: [...owned], period: MISSION_TANKS.garagePeriod, minBattles: 0 });
    const branchOf = new Map(rows.branches.map((branch) => [branch.chainId, branch]));
    const missionOf = new Map(rows.missions.map((mission) => [mission.questId, mission]));

    const bestTank = async (mission: Mission): Promise<VehicleSummary | null> => {
      const branch = branchOf.get(mission.chainId);

      if (!branch || owned.size === 0) {
        return null;
      }

      const eligible = await this.tanks.eligible({ mission, branch });
      const { metric } = this.tanks.metricOf({ mission });
      const [best] = rankTanks({
        candidates: stats.filter((row) => eligible.has(row.tankId)).map((row) => toCandidate({ row, metric })),
        limit: 1
      });

      return best ? (eligible.get(best.tankId) ?? null) : null;
    };

    const coverage = new Map(
      await Promise.all(
        rows.branches.map(async (branch) => {
          const first = rows.missions.find((mission) => mission.chainId === branch.chainId);
          const eligible = first ? await this.tanks.eligible({ mission: first, branch }) : new Map<number, VehicleSummary>();

          return [branch.chainId, [...owned].filter((tankId) => eligible.has(tankId)).length] as const;
        })
      )
    );

    const steps = planOperation({
      branches: toPlanBranches(rows),
      progress,
      coverage
    });

    return {
      operationId,
      remaining: steps.length,
      steps: await Promise.all(
        steps.map(async (step) => {
          const mission = missionOf.get(step.questId);

          return { ...step, tank: mission ? await bestTank(mission) : null };
        })
      )
    };
  }
}
