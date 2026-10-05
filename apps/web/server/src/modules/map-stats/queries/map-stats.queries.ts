import { sql } from 'kysely';
import { entries } from 'remeda';

import type { BonusMode, MapStatsWindowInput } from './map-stats.types';

import { moscowHour, percentile } from '../../../core';
import { GAME_MODE_BONUS_TYPES } from '../../reference';
import { MAP_STATS } from '../config/map-stats.constants';

const BONUS_MODES: readonly BonusMode[] = entries(GAME_MODE_BONUS_TYPES).flatMap(([mode, types]) =>
  types.map((type) => ({ battleType: String(type), mode }))
);

const bonusModes = () =>
  sql<{
    battle_type: string;
    mode: string;
  }>`(VALUES ${sql.join(BONUS_MODES.map(({ battleType, mode }) => sql`(${battleType}::text, ${mode}::text)`))})`.as<'modes'>(
    sql`modes(battle_type, mode)`
  );

const groupingSets = (sets: readonly (readonly string[])[]) =>
  sql`GROUPING SETS (${sql.join(sets.map((columns) => sql`(${sql.join(columns.map((column) => sql.ref(column)))})`))})`;

const battleRotationSamples = ({ db, from, to }: MapStatsWindowInput) =>
  db
    .selectFrom('battle')
    .innerJoin('vehicle', 'vehicle.tank_id', 'battle.tank_id')
    .innerJoin(bonusModes(), (join) => join.onRef('modes.battle_type', '=', 'battle.battle_type'))
    .select((eb) => ['battle.arena_unique_id as uid', 'battle.arena_id', 'vehicle.tier', 'modes.mode', eb.val('mod').as('src')])
    .where('battle.started_at', '>=', from)
    .where('battle.started_at', '<=', to);

const replayRotationSamples = ({ db, from, to }: MapStatsWindowInput) =>
  db
    .selectFrom('replay')
    .innerJoin('vehicle', 'vehicle.tank_id', 'replay.tank_id')
    .innerJoin(bonusModes(), (join) => join.onRef('modes.battle_type', '=', 'replay.battle_type'))
    .select((eb) => ['replay.arena_unique_id as uid', 'replay.arena_id', 'vehicle.tier', 'modes.mode', eb.val('replay').as('src')])
    .where('replay.status', '=', 'parsed')
    .where('replay.arena_id', 'is not', null)
    .where('replay.arena_unique_id', 'is not', null)
    .where('replay.played_at', '>=', from)
    .where('replay.played_at', '<=', to)
    .$narrowType<{ uid: number; arena_id: string }>();

export const rotationCounts = (input: MapStatsWindowInput) =>
  input.db
    .with('samples', () => battleRotationSamples(input).unionAll(replayRotationSamples(input)))
    .selectFrom('samples')
    .select((eb) => [
      'arena_id as arenaId',
      eb.fn.coalesce('tier', eb.lit(MAP_STATS.allTiers)).as('tier'),
      'mode',
      eb.fn.count<number>('uid').distinct().as('battles'),
      eb.fn.count<number>('uid').distinct().filterWhere('src', '=', 'mod').as('modBattles'),
      eb.fn.count<number>('uid').distinct().filterWhere('src', '=', 'replay').as('replayBattles')
    ])
    .groupBy(
      groupingSets([
        ['arena_id', 'tier', 'mode'],
        ['arena_id', 'mode']
      ])
    )
    .execute();

const queueSamples = ({ db, from, to }: MapStatsWindowInput) =>
  db
    .selectFrom('battle')
    .innerJoin('vehicle', 'vehicle.tank_id', 'battle.tank_id')
    .innerJoin(bonusModes(), (join) => join.onRef('modes.battle_type', '=', 'battle.battle_type'))
    .select((eb) => [
      'modes.mode',
      'vehicle.tier',
      moscowHour('battle.started_at').as('hour'),
      eb(eb.cast<number>('battle.queue_time_ms', 'double precision'), '/', MAP_STATS.msPerSecond).as('wait_sec')
    ])
    .where('battle.queue_time_ms', 'is not', null)
    .where('battle.started_at', '>=', from)
    .where('battle.started_at', '<=', to);

export const queueTimes = (input: MapStatsWindowInput) =>
  input.db
    .with('samples', () => queueSamples(input))
    .selectFrom('samples')
    .select((eb) => [
      eb.fn.coalesce('tier', eb.lit(MAP_STATS.allTiers)).as('tier'),
      'hour',
      'mode',
      eb.fn.countAll<number>().as('samples'),
      eb.fn.avg<number>('wait_sec').as('avgSec'),
      percentile({ fraction: 0.5, column: 'wait_sec' }).as('medianSec'),
      percentile({ fraction: 0.9, column: 'wait_sec' }).as('p90Sec')
    ])
    .groupBy(
      groupingSets([
        ['mode', 'tier', 'hour'],
        ['mode', 'hour']
      ])
    )
    .execute();

export const mapStatsQueries = { rotationCounts, queueTimes } as const;
