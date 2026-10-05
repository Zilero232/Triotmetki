import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { DailyStatsRow } from '../lib/server-stats';
import type { ServerPlayersRow } from '../queries';

import { moscowDayStart } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { AGGREGATES } from '../config';
import { buildServerStats, periodPlayersAt, SERVER_STATS } from '../lib/server-stats';
import { serverPlayersSql } from '../queries';
import { ReferenceTablesService } from './reference-tables.service';

@Injectable()
export class ServerStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tables: ReferenceTablesService
  ) {}

  async compute() {
    const { tiers } = await this.tables.tables();
    const now = new Date();
    let written = 0;

    for (const mode of AGGREGATES.serverStatsModes) {
      const until = moscowDayStart(now);
      const sinces = SERVER_STATS.periods.map(({ days }) => moscowDayStart(subDays(now, days)));
      const periodPlayers = await this.prisma.$queryRaw<ServerPlayersRow[]>(serverPlayersSql({ mode, sinces, until }));

      for (const [index, { period }] of SERVER_STATS.periods.entries()) {
        const since = sinces[index] ?? until;

        const rows = await this.prisma.$queryRaw<DailyStatsRow[]>`
          SELECT
            tank_id AS "tankId",
            cohort::text AS "cohort",
            sum(samples)::float8 AS "samples",
            sum(battles)::float8 AS "battles",
            sum(wins)::float8 AS "wins",
            sum(damage_dealt)::float8 AS "damage",
            sum(frags)::float8 AS "frags",
            sum(spotted)::float8 AS "spotted",
            sum(xp)::float8 AS "xp",
            sum(damage_blocked)::float8 AS "blocked",
            sum(survived_battles)::float8 AS "survived",
            sum(hits)::float8 AS "hits",
            sum(shots)::float8 AS "shots",
            sum(player_wins_weighted)::float8 AS "playerWins"
          FROM tank_daily_stats
          WHERE mode = ${mode}::stats_mode AND day >= ${since} AND day < ${until}
          GROUP BY tank_id, cohort
        `;

        const players = periodPlayersAt({ rows: periodPlayers, index });
        const stats = buildServerStats({ rows, players, tiers, mode, period });

        await this.prisma.$transaction([
          this.prisma.tankServerStats.deleteMany({ where: { mode, period } }),
          this.prisma.tankServerStats.createMany({
            data: stats.map((row) => ({ ...row, battles: Math.round(row.battles), samples: Math.round(row.samples), computedAt: now }))
          })
        ]);

        written += stats.length;
      }
    }

    return { rows: written };
  }
}
