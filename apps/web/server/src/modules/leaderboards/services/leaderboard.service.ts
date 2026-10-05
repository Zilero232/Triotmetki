import type { Leaderboard, LeaderboardQuery } from '@otmetki/schemas';

import { Inject, Injectable, Optional } from '@nestjs/common';
import { match } from 'ts-pattern';

import type { LeaderboardPage, LeaderboardQueries } from '../queries/leaderboard.types';

import { PrismaService } from '../../../core';
import { LEADERBOARD_MIN_BATTLES } from '../config/min-battles.constants';
import { RISING_STARS } from '../config/rising-stars.constants';
import { LEADERBOARD_QUERIES } from '../config/tokens.constants';
import { toLeaderboardEntry } from '../mappers/leaderboard.mappers';
import { leaderboardQueries } from '../queries/leaderboard.queries';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(LEADERBOARD_QUERIES) private readonly queries: LeaderboardQueries = leaderboardQueries
  ) {}

  async leaderboard(query: LeaderboardQuery): Promise<Leaderboard> {
    const { rows, total } = await this.page(query);
    const scale = query.scope === 'clans' || query.scope === 'marks' ? null : query.metric;

    return {
      scope: query.scope,
      metric: query.metric,
      period: query.period,
      total,
      minBattles: this.appliedMinBattles(query),
      entries: rows.map((row, index) => toLeaderboardEntry({ row, rank: query.offset + index + 1, scale }))
    };
  }

  private page(query: LeaderboardQuery): Promise<LeaderboardPage> {
    const db = this.prisma.$kysely;
    const minBattles = this.minBattles(query);

    return match(query.scope)
      .with('players', () =>
        query.tankId || query.tier || query.type
          ? this.queries.tankPlayersBoard({ db, query, minBattles })
          : this.queries.playersBoard({ db, query, minBattles, isStreamersOnly: false })
      )
      .with('clans', () => this.queries.clansBoard({ db, query }))
      .with('risingStars', () => {
        const period = this.risingStarsPeriod(query);

        return this.queries.risingStarsBoard({ db, query, period, minBattles: query.minBattles ?? LEADERBOARD_MIN_BATTLES[period] });
      })
      .with('marks', () => this.queries.marksBoard({ db, query }))
      .with('streamers', () => this.queries.playersBoard({ db, query, minBattles, isStreamersOnly: true }))
      .exhaustive();
  }

  private appliedMinBattles(query: LeaderboardQuery): number | null {
    return match(query.scope)
      .with('clans', 'marks', () => null)
      .with('risingStars', () => query.minBattles ?? LEADERBOARD_MIN_BATTLES[this.risingStarsPeriod(query)])
      .with('players', 'streamers', () => this.minBattles(query))
      .exhaustive();
  }

  private risingStarsPeriod(query: LeaderboardQuery) {
    return query.period === 'overall' ? RISING_STARS.fallbackPeriod : query.period;
  }

  private minBattles(query: LeaderboardQuery): number {
    return query.minBattles ?? LEADERBOARD_MIN_BATTLES[query.period];
  }
}
