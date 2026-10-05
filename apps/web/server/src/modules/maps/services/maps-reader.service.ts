import type { MapDetail, MapList, MapsQuery, MapStats } from '@otmetki/schemas';

import { Inject, Injectable, Optional } from '@nestjs/common';

import type { TeamStatsQueries } from '../queries/team-stats.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { insensitiveContains } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { MAPS_QUERIES } from '../config/tokens.constants';
import { statsFromBattles, statsFromReplays } from '../lib/team-stats/team-stats';
import { toMapDetail, toMapSummary } from '../mappers/map-detail.mappers';
import { teamStatsQueries } from '../queries/team-stats.queries';

@Injectable()
export class MapsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(MAPS_QUERIES.teamStats) private readonly queries: TeamStatsQueries = teamStatsQueries
  ) {}

  async list(query: MapsQuery): Promise<MapList> {
    const arenas = await this.prisma.arena.findMany({
      where: {
        isActive: true,
        ...(query.mode ? { modes: { has: query.mode } } : {}),
        ...(query.search ? { name: insensitiveContains(query.search) } : {})
      },
      orderBy: { name: 'asc' }
    });

    return arenas.map(toMapSummary);
  }

  async detail(idOrSlug: string): Promise<MapDetail> {
    const arena = await this.prisma.arena.findFirst({ where: { OR: [{ arenaId: idOrSlug }, { slug: idOrSlug }] } });

    if (!arena) {
      throw new AppNotFoundException('NOT_FOUND', `No map ${idOrSlug}`);
    }

    return toMapDetail({ arena, stats: await this.stats(arena.arenaId) });
  }

  private async stats(arenaId: string): Promise<MapStats | null> {
    const db = this.prisma.$kysely;
    const fromBattles = statsFromBattles(await this.queries.battleSides({ db, arenaId }));

    if (fromBattles) {
      return fromBattles;
    }

    return statsFromReplays(await this.queries.replayWinners({ db, arenaId }));
  }
}
