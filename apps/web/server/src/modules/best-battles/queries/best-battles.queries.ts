import { sql } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';

import type { BestBattleRow } from '../best-battles.types';
import type { FacetCountsInput, FacetFeedInput, FacetFeedRow, FacetsQueryInput, FeedPageQueryInput, ReplayFeedRowsInput } from './best-battles.types';

import { BEST_BATTLE_METRIC_COLUMN } from '../config/facets.constants';
import { scopedModBattles, scopedReplays } from './feed-scope.queries';

const recorderStat = (key: 'blocked' | 'spotted') => sql<number | null>`round((entry->'result'->>${sql.lit(key)})::numeric)::int`;

const recorderPlayers = sql<{
  entry: unknown;
}>`jsonb_array_elements(CASE WHEN jsonb_typeof(r.summary->'players') = 'array' THEN r.summary->'players' ELSE '[]'::jsonb END)`;

const modFeedRows = ({ db, metric, take, ...scope }: FeedPageQueryInput) =>
  scopedModBattles({ db, ...scope })
    .select((eb) => [
      sql.lit<'mod'>('mod').as('source'),
      'battle.id as battle_id',
      'battle.account_id',
      'battle.arena_unique_id',
      'p.nickname',
      'battle.tank_id',
      'battle.arena_id',
      eb.cast<string | null>(eb.lit(null), 'text').as('map_name'),
      'battle.result',
      'battle.damage_dealt as damage',
      eb(eb('battle.damage_assisted_radio', '+', eb.ref('battle.damage_assisted_track')), '+', eb.ref('battle.damage_assisted_stun')).as('assisted'),
      'battle.spotted',
      'battle.frags',
      'battle.xp',
      'battle.damage_blocked as blocked',
      'battle.achievements as medals',
      'battle.started_at as played_at'
    ])
    .orderBy(sql.ref(BEST_BATTLE_METRIC_COLUMN[metric]), 'desc')
    .orderBy('played_at', 'desc')
    .orderBy('battle_id')
    .limit(take);

const modFeedPage = (input: FeedPageQueryInput): Promise<BestBattleRow[]> => {
  const column = BEST_BATTLE_METRIC_COLUMN[input.metric];

  return input.db
    .selectFrom(modFeedRows(input).as('feed'))
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom('replay as r')
          .select('r.id')
          .whereRef('r.account_id', '=', 'feed.account_id')
          .whereRef('r.arena_unique_id', '=', 'feed.arena_unique_id')
          .where('r.visibility', '=', 'public')
          .where('r.status', '=', 'parsed')
          .orderBy('r.created_at')
          .limit(1)
          .as('rp'),
      (join) => join.onTrue()
    )
    .selectAll('feed')
    .select('rp.id as replay_id')
    .orderBy(sql.ref(`feed.${column}`), 'desc')
    .orderBy('feed.played_at', 'desc')
    .orderBy('feed.battle_id')
    .execute();
};

const replayFeedRows = ({ db, ...scope }: ReplayFeedRowsInput) =>
  scopedReplays({ db, ...scope })
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom(recorderPlayers.as('entry'))
          .select([recorderStat('spotted').as('spotted'), recorderStat('blocked').as('blocked')])
          .where(sql<boolean>`entry->>'isRecorder' = 'true'`)
          .limit(1)
          .as('rec'),
      (join) => join.onTrue()
    )
    .select((eb) => [
      sql.lit<'replay'>('replay').as('source'),
      'r.id as battle_id',
      'r.account_id',
      'r.arena_unique_id',
      eb.fn.coalesce('p.nickname', sql<string | null>`r.summary->'recorder'->>'name'`).as('nickname'),
      'r.tank_id',
      'r.arena_id',
      'r.map_name',
      'r.result',
      'r.damage_dealt as damage',
      'r.damage_assisted as assisted',
      'rec.spotted',
      'r.frags',
      'r.xp',
      'rec.blocked',
      'r.medals',
      'r.played_at',
      'r.id as replay_id'
    ])
    .$narrowType<{ account_id: number; tank_id: number; played_at: Date }>();

const replayFeedPage = ({ db, metric, take, ...scope }: FeedPageQueryInput): Promise<BestBattleRow[]> => {
  const column = BEST_BATTLE_METRIC_COLUMN[metric];

  return db
    .selectFrom(replayFeedRows({ db, ...scope }).as('feed'))
    .selectAll('feed')
    .where((eb) => eb(sql.ref(`feed.${column}`), 'is not', null))
    .orderBy(sql.ref(`feed.${column}`), 'desc')
    .orderBy('feed.played_at', 'desc')
    .orderBy('feed.battle_id')
    .limit(take)
    .execute();
};

const facetFeed = ({ db, since, battleTypes }: FacetFeedInput) =>
  scopedModBattles({ db, since, battleTypes, tankIds: null })
    .select(['battle.tank_id', 'battle.arena_id', 'battle.damage_dealt as damage', 'battle.achievements as medals'])
    .$castTo<FacetFeedRow>()
    .unionAll(
      scopedReplays({ db, since, battleTypes, tankIds: null })
        .select(['r.tank_id', 'r.arena_id', 'r.damage_dealt as damage', 'r.medals'])
        .$narrowType<{ tank_id: number }>()
    );

const medalCounts = ({ eb, take }: FacetCountsInput) =>
  eb
    .selectFrom(
      eb
        .selectFrom('feed')
        .select((inner) => inner.fn<string>('unnest', ['feed.medals']).as('medal'))
        .as('feed_medal')
    )
    .select((inner) => ['feed_medal.medal as key', inner.fn.countAll<number>().as('battles')])
    .groupBy('feed_medal.medal')
    .orderBy('battles', 'desc')
    .orderBy('feed_medal.medal')
    .limit(take);

const tankCounts = ({ eb, take }: FacetCountsInput) =>
  eb
    .selectFrom('feed')
    .select((inner) => ['feed.tank_id', inner.fn.countAll<number>().as('battles')])
    .groupBy('feed.tank_id')
    .orderBy('battles', 'desc')
    .orderBy('feed.tank_id')
    .limit(take);

const arenaCounts = ({ eb, take }: FacetCountsInput) =>
  eb
    .selectFrom('feed')
    .select((inner) => ['feed.arena_id', inner.fn.countAll<number>().as('battles')])
    .where('feed.arena_id', 'is not', null)
    .groupBy('feed.arena_id')
    .orderBy('battles', 'desc')
    .orderBy('feed.arena_id')
    .limit(take)
    .$narrowType<{ arena_id: string }>();

const facetCounts = ({ db, since, battleTypes, take }: FacetsQueryInput) =>
  db
    .with('feed', (query) => facetFeed({ db: query, since, battleTypes }))
    .selectNoFrom((eb) => [
      eb.selectFrom('feed').select(eb.fn.countAll<number>().as('battles')).as('battles'),
      eb
        .selectFrom('feed')
        .select((inner) => inner.fn.max('feed.damage').as('top_damage'))
        .as('top_damage'),
      jsonArrayFrom(medalCounts({ eb, take: take.medals })).as('medals'),
      jsonArrayFrom(tankCounts({ eb, take: take.tanks })).as('tanks'),
      jsonArrayFrom(arenaCounts({ eb, take: take.arenas })).as('arenas')
    ])
    .executeTakeFirstOrThrow();

export const bestBattlesQueries = { modFeedPage, replayFeedPage, facetCounts } as const;
