import type { TankDetail } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { isObjectType } from 'remeda';

import type { TankDetailInput } from '../tanks.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { SERVER_PERIOD_TO_DB, STATS_MODE_TO_DB } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { SweatIndexService } from '../../marks';
import { readVehicleStats, ThresholdsService, toMasteryThreshold, toMoeThreshold, VehicleCatalogService } from '../../reference';
import { TANK_PROFILES, TOP_PLAYERS } from '../config';
import { toServerStatsRow } from '../mappers';
import { TankEconomyReaderService } from './tank-economy-reader.service';
import { TankLearningReaderService } from './tank-learning-reader.service';
import { TankObtainReaderService } from './tank-obtain-reader.service';
import { TopPlayersReaderService } from './top-players-reader.service';

@Injectable()
export class TankDetailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly thresholds: ThresholdsService,
    private readonly topPlayers: TopPlayersReaderService,
    private readonly obtainInfo: TankObtainReaderService,
    private readonly economy: TankEconomyReaderService,
    private readonly learning: TankLearningReaderService,
    private readonly sweat: SweatIndexService
  ) {}

  async resolve(idOrSlug: string): Promise<number> {
    const numeric = Number(idOrSlug);
    const entry = Number.isInteger(numeric) && numeric > 0 ? await this.catalog.find(numeric) : await this.catalog.bySlug(idOrSlug);

    if (!entry) {
      throw new AppNotFoundException('TANK_NOT_FOUND', `No tank ${idOrSlug}`);
    }

    return entry.summary.tankId;
  }

  async detail({ idOrSlug, query }: TankDetailInput): Promise<TankDetail> {
    const tankId = await this.resolve(idOrSlug);
    const entry = await this.catalog.find(tankId);

    if (!entry) {
      throw new AppNotFoundException('TANK_NOT_FOUND', `No tank ${idOrSlug}`);
    }

    const [stats, profiles, moe, mastery, top, obtain, economy, learning, sweat] = await Promise.all([
      this.prisma.tankServerStats.findMany({
        where: { tankId, mode: STATS_MODE_TO_DB[query.mode], period: SERVER_PERIOD_TO_DB[query.period] }
      }),
      this.prisma.vehicleProfile.findMany({ where: { tankId, profileId: { in: [TANK_PROFILES.stock, TANK_PROFILES.top] } } }),
      this.thresholds.moe(tankId),
      this.thresholds.mastery(tankId),
      this.topPlayers.top({
        tankId,
        query: { period: 'overall', metric: 'wn8', limit: TOP_PLAYERS.detailLimit, minBattles: TOP_PLAYERS.defaultMinBattles }
      }),
      this.obtainInfo.obtain(tankId),
      this.economy.forTank(tankId),
      this.learning.forTank(tankId),
      this.sweat.forTank(tankId)
    ]);

    return {
      vehicle: entry.summary,
      description: entry.description,
      specs: isObjectType(entry.specs) && !Array.isArray(entry.specs) ? { ...entry.specs } : null,
      stats: {
        stock: readVehicleStats(profiles.find((profile) => profile.profileId === TANK_PROFILES.stock)?.data),
        top: readVehicleStats(profiles.find((profile) => profile.profileId === TANK_PROFILES.top)?.data)
      },
      serverStats: stats.map((row) => toServerStatsRow({ row, vehicle: entry.summary, period: query.period, cohort: row.cohort, mode: query.mode })),
      moe: moe ? toMoeThreshold(moe) : null,
      mastery: mastery ? toMasteryThreshold(mastery) : null,
      topPlayers: top.entries,
      obtain,
      economy,
      learning,
      sweat
    };
  }
}
