import { Injectable } from '@nestjs/common';
import { firstBy, sumBy } from 'remeda';

import type { MapQueueInput, MapQueueView, MapRotationView, MapStatsQuery } from '../map-stats.types';

import { PrismaService } from '../../../core';
import { MAP_STATS } from '../config/map-stats.constants';
import { queueNow, zoneHour } from '../lib/queue-hours/queue-hours';
import { toMapRotationRow, toQueueCell } from '../mappers/map-stats.mappers';

@Injectable()
export class MapStatsReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async rotation({ tier, mode }: MapStatsQuery): Promise<MapRotationView> {
    const rows = await this.prisma.mapRotationAggregate.findMany({ where: { tier, mode }, orderBy: [{ share: 'desc' }, { arenaId: 'asc' }] });
    const arenas = await this.prisma.arena.findMany({
      where: { arenaId: { in: rows.map((row) => row.arenaId) } },
      select: { arenaId: true, name: true, slug: true, image: true, camouflageType: true }
    });

    const byId = new Map(arenas.map((arena) => [arena.arenaId, arena]));
    const latest = firstBy(rows, [(row) => row.computedAt.getTime(), 'desc']);

    return {
      tier,
      mode,
      windowDays: latest?.windowDays ?? MAP_STATS.windowDays,
      battles: sumBy(rows, (row) => row.battles),
      rows: rows.map((row) => toMapRotationRow({ row, arena: byId.get(row.arenaId) })),
      computedAt: latest ? latest.computedAt.toISOString() : null
    };
  }

  async queue({ tier, mode, now }: MapQueueInput): Promise<MapQueueView> {
    const rows = await this.prisma.queueTimeAggregate.findMany({ where: { mode }, orderBy: [{ tier: 'asc' }, { hour: 'asc' }] });
    const cells = rows.map(toQueueCell);
    const latest = firstBy(rows, [(row) => row.computedAt.getTime(), 'desc']);

    return {
      tier,
      mode,
      timezone: MAP_STATS.timezone,
      windowDays: latest?.windowDays ?? MAP_STATS.windowDays,
      minSamples: MAP_STATS.minQueueSamples,
      cells,
      now: queueNow({ cells, hour: zoneHour({ at: now, zone: MAP_STATS.timezone }), tier, minSamples: MAP_STATS.minQueueSamples }),
      computedAt: latest ? latest.computedAt.toISOString() : null
    };
  }
}
