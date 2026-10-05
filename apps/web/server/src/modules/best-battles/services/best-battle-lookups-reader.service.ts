import type { VehicleSummary } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { unique } from 'remeda';

import type { LookupsInput } from '../best-battles.types';
import type { BestBattleLookups, BestBattleMedal } from '../mappers/best-battles.types';

import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';

@Injectable()
export class BestBattleLookupsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async lookups({ tankIds, arenaIds, medalNames }: LookupsInput): Promise<BestBattleLookups> {
    const [vehicles, arenas, medals] = await Promise.all([
      Promise.all(unique(tankIds).map((tankId) => this.catalog.summary(tankId))),
      this.prisma.arena.findMany({ where: { arenaId: { in: unique(arenaIds) } }, select: { arenaId: true, name: true } }),
      this.prisma.achievement.findMany({ where: { name: { in: unique(medalNames) } }, select: { name: true, title: true, image: true } })
    ]);

    return {
      vehicles: new Map<number, VehicleSummary>(vehicles.map((vehicle) => [vehicle.tankId, vehicle])),
      arenas: new Map(arenas.map((arena) => [arena.arenaId, arena.name])),
      medals: new Map<string, BestBattleMedal>(medals.map((medal) => [medal.name, medal]))
    };
  }
}
