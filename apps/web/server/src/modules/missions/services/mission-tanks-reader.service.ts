import type { MissionGarage, MissionTanks, SkillCohort, VehicleSummary } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { TankServerStats } from '../../../../generated';
import type { MissionMetricChoice } from '../lib/condition-metrics/condition-metrics.types';
import type { GarageState, MissionContext, MissionTanksInput, ServerStatsInput, ServerStatsResult, UserQuestInput } from '../missions.types';

import { COHORT_TO_DB, SERVER_PERIOD_TO_DB, STATS_MODE_TO_DB, winRatePercent } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { UserAccountsReaderService } from '../../accounts';
import { VehicleCatalogService } from '../../reference';
import { MISSION_TANKS } from '../config/suitable-tanks.constants';
import { missionMetric } from '../lib/condition-metrics/condition-metrics';
import { missionFilter } from '../lib/eligibility/eligibility';
import { rankTanks, toCandidate } from '../lib/tank-fit/tank-fit';
import { readConditions, toConditionView } from '../mappers/mission.mappers';
import { MissionCatalogReaderService } from './mission-catalog-reader.service';

@Injectable()
export class MissionTanksReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly missions: MissionCatalogReaderService,
    private readonly accounts: UserAccountsReaderService
  ) {}

  async tanks({ questId, period, limit }: MissionTanksInput): Promise<MissionTanks> {
    const context = await this.missions.mission(questId);
    const { metric, progressId } = this.metricOf(context);
    const eligible = await this.eligible(context);
    const { cohort, rows } = await this.serverStats({ tankIds: [...eligible.keys()], period });
    const ranked = rankTanks({ candidates: rows.map((row) => toCandidate({ row, metric })), limit });
    const generatedAt = rows.reduce<Date | null>((latest, row) => (!latest || row.computedAt > latest ? row.computedAt : latest), null);

    return {
      questId,
      metric,
      progressId,
      cohort,
      period,
      generatedAt: generatedAt?.toISOString() ?? null,
      tanks: ranked.flatMap((candidate) => {
        const vehicle = eligible.get(candidate.tankId);

        return vehicle ? [{ vehicle, value: candidate.value, winRate: candidate.winRate, battles: candidate.battles, score: candidate.score }] : [];
      })
    };
  }

  async garage({ userId, questId }: UserQuestInput): Promise<MissionGarage> {
    const context = await this.missions.mission(questId);
    const { metric } = this.metricOf(context);
    const garage = await this.garageTanks(userId);

    if (garage.state !== 'ready') {
      return { questId, metric, state: garage.state, tanks: [] };
    }

    const eligible = await this.eligible(context);
    const owned = garage.tanks.filter((tank) => eligible.has(tank.tankId));
    const { rows } = await this.serverStats({ tankIds: owned.map((tank) => tank.tankId), period: MISSION_TANKS.garagePeriod, minBattles: 0 });
    const statsOf = new Map(rows.map((row) => [row.tankId, row]));
    const ranked = rankTanks({
      candidates: owned.map((tank) => {
        const row = statsOf.get(tank.tankId);

        return row ? toCandidate({ row, metric }) : { tankId: tank.tankId, value: 0, winRate: 0, battles: 0 };
      })
    });

    const ownOf = new Map(owned.map((tank) => [tank.tankId, tank]));

    return {
      questId,
      metric,
      state: 'ready',
      tanks: ranked.flatMap((candidate) => {
        const vehicle = eligible.get(candidate.tankId);
        const own = ownOf.get(candidate.tankId);

        return vehicle && own
          ? [{ ...candidate, vehicle, ownBattles: own.battles, ownWinRate: winRatePercent({ wins: own.wins, battles: own.battles }) }]
          : [];
      })
    };
  }

  async garageTanks(userId: string): Promise<GarageState> {
    const accountId = await this.accounts.primaryAccountId(userId);

    if (accountId === null) {
      return { state: 'noLink', tanks: [] };
    }

    const tanks = await this.prisma.playerTank.findMany({
      where: { accountId, inGarage: { not: null } },
      select: { tankId: true, battles: true, wins: true, inGarage: true }
    });

    if (tanks.length === 0) {
      return { state: 'noPrivateData', tanks: [] };
    }

    return { state: 'ready', tanks: tanks.filter((tank) => tank.inGarage === true) };
  }

  async serverStats({ tankIds, period, minBattles = MISSION_TANKS.minBattles }: ServerStatsInput): Promise<ServerStatsResult> {
    const load = (cohort: SkillCohort): Promise<TankServerStats[]> =>
      this.prisma.tankServerStats.findMany({
        where: {
          tankId: { in: tankIds },
          mode: STATS_MODE_TO_DB[MISSION_TANKS.mode],
          period: SERVER_PERIOD_TO_DB[period],
          cohort: COHORT_TO_DB[cohort],
          battles: { gte: minBattles }
        }
      });

    if (tankIds.length === 0) {
      return { cohort: MISSION_TANKS.cohort, rows: [] };
    }

    const rows = await load(MISSION_TANKS.cohort);

    return rows.length > 0
      ? { cohort: MISSION_TANKS.cohort, rows }
      : { cohort: MISSION_TANKS.fallbackCohort, rows: await load(MISSION_TANKS.fallbackCohort) };
  }

  metricOf({ mission }: Pick<MissionContext, 'mission'>): MissionMetricChoice {
    return missionMetric(readConditions(mission.conditions).map(toConditionView));
  }

  async eligible(context: MissionContext): Promise<Map<number, VehicleSummary>> {
    const entries = await this.catalog.filter(missionFilter(context));

    return new Map(entries.map((entry) => [entry.summary.tankId, entry.summary]));
  }
}
