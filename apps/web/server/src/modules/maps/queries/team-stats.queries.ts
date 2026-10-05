import { sql } from 'kysely';

import type { TeamStatsInput } from './team-stats.types';

const winnerTeam = sql<number | null>`(${sql.ref('replay.summary')}->>'winnerTeam')::int`;

export const battleSides = ({ db, arenaId }: TeamStatsInput) =>
  db
    .selectFrom((eb) =>
      eb
        .selectFrom('battle')
        .distinctOn('arena_unique_id')
        .select(['team', 'result'])
        .where('arena_id', '=', arenaId)
        .where('team', 'is not', null)
        .orderBy('arena_unique_id')
        .orderBy('received_at')
        .as('first_report')
    )
    .select((eb) => ['team', 'result', eb.fn.countAll<number>().as('battles')])
    .groupBy(['team', 'result'])
    .execute();

export const replayWinners = ({ db, arenaId }: TeamStatsInput) =>
  db
    .selectFrom('replay')
    .select((eb) => [
      winnerTeam.as('winner'),
      eb.fn
        .count<number>(eb.fn.coalesce(eb.cast<string>('arena_unique_id', 'text'), 'id'))
        .distinct()
        .as('battles')
    ])
    .where('arena_id', '=', arenaId)
    .where('status', '=', 'parsed')
    .where('summary', 'is not', null)
    .groupBy(winnerTeam)
    .execute();

export const teamStatsQueries = { battleSides, replayWinners } as const;
