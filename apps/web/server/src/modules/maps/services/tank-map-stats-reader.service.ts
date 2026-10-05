import type { MapTanks, TankMaps } from '@otmetki/schemas';

import { Inject, Injectable, Optional } from '@nestjs/common';
import { TANK_MAPS } from '@otmetki/schemas';
import { subDays } from 'date-fns';
import { sumBy } from 'remeda';

import type { MapSampleRow, MapSamplesQueries, MapSamplesScope } from '../queries/map-samples.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { TANK_MAP_STATS } from '../config/maps.constants';
import { MAPS_QUERIES } from '../config/tokens.constants';
import { toMapSample } from '../lib/map-sample/map-sample';
import { toMapRef } from '../mappers/map-detail.mappers';
import { mapSamplesQueries } from '../queries/map-samples.queries';

@Injectable()
export class TankMapStatsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    @Optional() @Inject(MAPS_QUERIES.mapSamples) private readonly queries: MapSamplesQueries = mapSamplesQueries
  ) {}

  async forTank(tankId: number): Promise<TankMaps> {
    const rows = await this.samples({ tankId });
    const arenas = await this.prisma.arena.findMany({
      where: { arenaId: { in: rows.map((row) => row.key) } },
      select: { arenaId: true, slug: true, name: true, nameEn: true, image: true }
    });

    const byId = new Map(arenas.map((arena) => [arena.arenaId, arena]));

    return {
      tankId,
      ...this.window(rows),
      maps: rows.map((row) => ({ map: toMapRef({ arena: byId.get(row.key) ?? null, arenaId: row.key }), ...toMapSample(row) }))
    };
  }

  async forMap(idOrSlug: string): Promise<MapTanks> {
    const arena = await this.prisma.arena.findFirst({ where: { OR: [{ arenaId: idOrSlug }, { slug: idOrSlug }] }, select: { arenaId: true } });

    if (!arena) {
      throw new AppNotFoundException('NOT_FOUND', `No map ${idOrSlug}`);
    }

    const rows = await this.samples({ arenaId: arena.arenaId });
    const tanks = await Promise.all(rows.map(async (row) => ({ vehicle: await this.catalog.summary(Number(row.key)), ...toMapSample(row) })));

    return { arenaId: arena.arenaId, ...this.window(rows), tanks };
  }

  private samples(scope: MapSamplesScope): Promise<MapSampleRow[]> {
    return this.queries.mapSamples({
      db: this.prisma.$kysely,
      scope,
      since: subDays(new Date(), TANK_MAPS.windowDays),
      battleType: TANK_MAP_STATS.randomBattleType
    });
  }

  private window(rows: readonly MapSampleRow[]) {
    return { windowDays: TANK_MAPS.windowDays, minBattles: TANK_MAPS.minBattles, battles: sumBy(rows, (row) => row.battles) };
  }
}
