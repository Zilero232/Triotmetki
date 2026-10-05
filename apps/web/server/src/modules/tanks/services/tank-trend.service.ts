import type { TankTrend } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { max, subDays } from 'date-fns';

import type { TankTrendInput, TrendRow } from '../tanks.types';

import { moscowDay, moscowDayStart, STATS_MODE_SQL } from '../../../common/lib';
import { TIME, TIMESCALE } from '../../../config';
import { PrismaService } from '../../../core';
import { toTrendPoints } from '../mappers';

@Injectable()
export class TankTrendService {
  constructor(private readonly prisma: PrismaService) {}

  async trend({ tankId, query }: TankTrendInput): Promise<TankTrend> {
    const now = new Date();
    const from = moscowDayStart(subDays(now, query.days - 1));
    const recent = max([from, moscowDayStart(subDays(now, TIMESCALE.compressAfterDays - 1))]);
    const mode = STATS_MODE_SQL[query.mode];

    const rows = await this.prisma.$queryRaw<TrendRow[]>`
      WITH sums AS (
        SELECT to_char(day AT TIME ZONE ${TIME.zone}, 'YYYY-MM-DD') AS day,
               sum(battles)::float8 AS battles,
               sum(wins)::float8 AS wins,
               sum(damage_dealt)::float8 AS damage
        FROM tank_daily_stats
        WHERE tank_id = ${tankId} AND mode = ${mode}::stats_mode AND day >= ${from}
        GROUP BY 1
      ),
      players AS (
        SELECT to_char(captured_at AT TIME ZONE ${TIME.zone}, 'YYYY-MM-DD') AS day,
               count(DISTINCT account_id)::float8 AS players
        FROM tank_battle_delta
        WHERE tank_id = ${tankId} AND mode = ${mode}::stats_mode AND captured_at >= ${recent}
        GROUP BY 1
      )
      SELECT sums.day, sums.battles, sums.wins, sums.damage,
             CASE WHEN sums.day >= ${moscowDay(recent)} THEN coalesce(players.players, 0) END AS players
      FROM sums
      LEFT JOIN players ON players.day = sums.day
      ORDER BY 1
    `;

    return { tankId, mode: query.mode, days: query.days, points: toTrendPoints(rows) };
  }
}
