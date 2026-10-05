import { utc } from '@date-fns/utc';
import { Inject, Injectable } from '@nestjs/common';
import { MASTERY_PERCENTILES } from '@otmetki/ratings';
import { startOfDay } from 'date-fns';

import type { LestaClients } from '../../../../core';

import { toJsonValue } from '../../../../common/lib';
import { LESTA_CLIENTS, PrismaService } from '../../../../core';
import { masteryThresholdLevels } from '../../../reference';
import { REFERENCE } from '../config/reference.constants';
import { masteryPercentiles, masteryThresholdRows } from '../lib/community-data';

@Injectable()
export class MasteryThresholdsSyncService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients
  ) {}

  async sync() {
    const vehicles = await this.prisma.vehicle.findMany({ where: { isActive: true }, select: { tankId: true } });

    if (vehicles.length === 0) {
      return { vehicles: 0 };
    }

    const tankIds = vehicles.map((vehicle) => vehicle.tankId);

    const [distribution, damage] = await Promise.all([
      this.clients.bulk.tanks.mastery({
        tankIds,
        distribution: REFERENCE.masteryDistribution,
        percentiles: masteryPercentiles(Object.values(MASTERY_PERCENTILES))
      }),
      this.clients.bulk.tanks.mastery({ tankIds, distribution: REFERENCE.damageDistribution, percentiles: REFERENCE.masteryPercentiles })
    ]);

    const rows = masteryThresholdRows(distribution);

    if (rows.length === 0) {
      return { vehicles: 0 };
    }

    const date = startOfDay(new Date(), { in: utc });

    await this.prisma.$transaction([
      this.prisma.tankThreshold.deleteMany({ where: { kind: 'mastery', source: 'lesta', date } }),
      this.prisma.tankThreshold.createMany({
        data: rows.map(({ tankId, ...levels }) => ({
          kind: 'mastery' as const,
          tankId,
          date,
          source: 'lesta' as const,
          ...masteryThresholdLevels(levels)
        }))
      }),
      this.prisma.tankPercentile.deleteMany({ where: { distribution: REFERENCE.masteryDistribution, date } }),
      this.prisma.tankPercentile.createMany({
        data: Object.entries(distribution).map(([tankId, percentiles]) => ({
          tankId: Number(tankId),
          date,
          distribution: REFERENCE.masteryDistribution,
          percentiles: toJsonValue(percentiles)
        }))
      }),
      this.prisma.tankPercentile.deleteMany({ where: { distribution: REFERENCE.damageDistribution, date } }),
      this.prisma.tankPercentile.createMany({
        data: Object.entries(damage).map(([tankId, percentiles]) => ({
          tankId: Number(tankId),
          date,
          distribution: REFERENCE.damageDistribution,
          percentiles: toJsonValue(percentiles)
        }))
      })
    ]);

    return { vehicles: rows.length, damageVehicles: Object.keys(damage).length };
  }
}
