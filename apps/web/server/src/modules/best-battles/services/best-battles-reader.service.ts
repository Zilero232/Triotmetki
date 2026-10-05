import { Inject, Injectable, Optional } from '@nestjs/common';

import type { BestBattle, BestBattleRow, BestBattlesPage, CandidatesInput, FeedPageInput, TankScopeInput } from '../best-battles.types';
import type { BestBattlesQueries } from '../queries/best-battles.types';

import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { BEST_BATTLES } from '../config/feed.constants';
import { BEST_BATTLES_QUERIES } from '../config/queries.constants';
import { periodSince } from '../lib/battle-period/battle-period';
import { mergeFeed } from '../lib/feed-merge/feed-merge';
import { toBestBattle } from '../mappers/best-battles.mappers';
import { bestBattlesQueries } from '../queries/best-battles.queries';
import { BestBattleLookupsReaderService } from './best-battle-lookups-reader.service';

@Injectable()
export class BestBattlesReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly lookups: BestBattleLookupsReaderService,
    @Optional() @Inject(BEST_BATTLES_QUERIES) private readonly queries: BestBattlesQueries = bestBattlesQueries
  ) {}

  async page({ query, now }: FeedPageInput): Promise<BestBattlesPage> {
    const { period, metric, arenaId, medal, limit } = query;
    const since = periodSince({ period, now });
    const offset = Number(query.cursor ?? 0);
    const tankIds = await this.tankScope(query);
    const head = { period, metric, since: since.toISOString() };

    if (tankIds?.length === 0 || offset >= BEST_BATTLES.maxRank) {
      return { ...head, items: [], nextCursor: null };
    }

    const rows = await this.candidates({ since, tankIds, arenaId, medal, metric, take: offset + limit + 1 });
    const page = mergeFeed({ rows, metric, offset, limit });
    const lookups = await this.lookups.lookups({
      tankIds: page.rows.map((row) => row.tank_id),
      arenaIds: page.rows.flatMap((row) => (row.arena_id === null ? [] : [row.arena_id])),
      medalNames: page.rows.flatMap((row) => row.medals)
    });

    return {
      ...head,
      items: page.rows.flatMap((row): BestBattle[] => {
        const battle = toBestBattle({ row, ...lookups });

        return battle ? [battle] : [];
      }),
      nextCursor: page.nextOffset === null ? null : String(page.nextOffset)
    };
  }

  private async candidates(input: CandidatesInput): Promise<BestBattleRow[]> {
    const scope = { ...input, db: this.prisma.$kysely, battleTypes: BEST_BATTLES.battleTypes };
    const [mod, replays] = await Promise.all([this.queries.modFeedPage(scope), this.queries.replayFeedPage(scope)]);

    return [...mod, ...replays];
  }

  private async tankScope({ tankId, tier, type }: TankScopeInput): Promise<number[] | null> {
    if (tier === undefined && type === undefined) {
      return tankId === undefined ? null : [tankId];
    }

    const entries = await this.catalog.filter({
      ...(tier === undefined ? {} : { tiers: [tier] }),
      ...(type === undefined ? {} : { types: [type] })
    });

    const ids = entries.map((entry) => entry.summary.tankId);

    return tankId === undefined ? ids : ids.filter((id) => id === tankId);
  }
}
