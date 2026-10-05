import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { ServerQueries } from '../server.types';
import type { WritePeriodInput } from './server-stats-aggregate.types';

import { moscowDayStart } from '../../../../../common/lib';
import { PrismaService } from '../../../../../core';
import { ReferenceTablesService } from '../../player-ratings';
import { SERVER_STATS_AGGREGATE } from '../config/server.constants';
import { SERVER_AGGREGATE_TOKENS } from '../config/tokens.constants';
import { buildServerStats, periodPlayersAt, SERVER_STATS } from '../lib/server-stats';

@Injectable()
export class ServerStatsAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tables: ReferenceTablesService,
    @Inject(SERVER_AGGREGATE_TOKENS.queries) private readonly queries: ServerQueries
  ) {}

  async compute() {
    const { tiers } = await this.tables.tables();
    const now = new Date();
    const db = this.prisma.$kysely;
    let written = 0;

    for (const mode of SERVER_STATS_AGGREGATE.modes) {
      const until = moscowDayStart(now);
      const sinces = SERVER_STATS.periods.map(({ days }) => moscowDayStart(subDays(now, days)));
      const periodPlayers = await this.queries.serverPlayers({ db, mode, sinces, until });

      for (const [index, { period }] of SERVER_STATS.periods.entries()) {
        const rows = await this.queries.dailyStats({ db, mode, since: sinces[index] ?? until, until });
        const players = periodPlayersAt({ rows: periodPlayers, index });

        written += await this.writePeriod({ stats: buildServerStats({ rows, players, tiers, mode, period }), mode, period, now });
      }
    }

    return { rows: written };
  }

  private async writePeriod({ stats, mode, period, now }: WritePeriodInput): Promise<number> {
    await this.prisma.$transaction([
      this.prisma.tankServerStats.deleteMany({ where: { mode, period } }),
      this.prisma.tankServerStats.createMany({
        data: stats.map((row) => ({ ...row, battles: Math.round(row.battles), samples: Math.round(row.samples), computedAt: now }))
      })
    ]);

    return stats.length;
  }
}
