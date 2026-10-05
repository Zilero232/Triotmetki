import { Inject, Injectable, Optional } from '@nestjs/common';

import type { BestBattlesFacets, FacetsInput } from '../best-battles.types';
import type { BestBattlesQueries } from '../queries/best-battles.types';

import { PrismaService } from '../../../core';
import { BEST_BATTLES } from '../config/feed.constants';
import { BEST_BATTLES_QUERIES } from '../config/queries.constants';
import { periodSince } from '../lib/battle-period/battle-period';
import { toFacets } from '../mappers/best-battles.mappers';
import { bestBattlesQueries } from '../queries/best-battles.queries';
import { BestBattleLookupsReaderService } from './best-battle-lookups-reader.service';

@Injectable()
export class BestBattleFacetsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lookups: BestBattleLookupsReaderService,
    @Optional() @Inject(BEST_BATTLES_QUERIES) private readonly queries: BestBattlesQueries = bestBattlesQueries
  ) {}

  async facets({ query: { period }, now }: FacetsInput): Promise<BestBattlesFacets> {
    const since = periodSince({ period, now });
    const counts = await this.queries.facetCounts({
      db: this.prisma.$kysely,
      since,
      battleTypes: BEST_BATTLES.battleTypes,
      take: { medals: BEST_BATTLES.facetMedals, tanks: BEST_BATTLES.facetTanks, arenas: BEST_BATTLES.facetArenas }
    });

    const lookups = await this.lookups.lookups({
      tankIds: counts.tanks.map((row) => row.tank_id),
      arenaIds: counts.arenas.map((row) => row.arena_id),
      medalNames: counts.medals.map((row) => row.key)
    });

    return toFacets({ counts, lookups, period, since, now });
  }
}
