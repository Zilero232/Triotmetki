import type { ServerPlayersSqlInput } from './server-players.types';

import { Prisma } from '../../../../../../generated';

export const serverPlayersSql = ({ mode, sinces, until }: ServerPlayersSqlInput): Prisma.Sql => {
  const earliest = new Date(Math.min(...sinces.map((since) => since.getTime())));
  const counts = Prisma.join(
    sinces.map((since) => Prisma.sql`count(DISTINCT account_id) FILTER (WHERE captured_at >= ${since})::int`),
    ', '
  );

  return Prisma.sql`
    SELECT tank_id AS "tankId", coalesce(cohort::text, 'all') AS "cohort", ARRAY[${counts}] AS "players"
    FROM tank_battle_delta
    WHERE mode = ${mode}::stats_mode AND captured_at >= ${earliest} AND captured_at < ${until}
    GROUP BY GROUPING SETS ((tank_id, cohort), (tank_id))
  `;
};
