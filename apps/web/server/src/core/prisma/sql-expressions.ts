import type { ExpressionBuilder } from 'kysely';

import { sql } from 'kysely';

import type { DB } from '../../../generated/kysely/database';
import type {
  JsonbPathTextInput,
  MoscowBucketInput,
  MoscowWeekdayInput,
  PercentileInput,
  PercentilesInput,
  PlusHoursInput,
  StatSumAlias,
  TrigramSimilarInput,
  ValuesColumnType,
  ValuesTableInput,
  WidthBucketInput
} from './sql-expressions.types';

import { TIME } from '../../config/time.constants';
import { STAT_SUM_COLUMN } from './sql-expressions.constants';

export const statSums = <Alias extends StatSumAlias>(aliases: readonly Alias[]) =>
  aliases.map((alias) => sql<number>`sum(${sql.ref(STAT_SUM_COLUMN[alias])})`.as(alias));

export const moscowBucket = ({ granularity, column }: MoscowBucketInput) =>
  sql<Date>`(date_trunc(${granularity}, ${sql.ref(column)} AT TIME ZONE ${TIME.zone}) AT TIME ZONE ${TIME.zone})`;

export const moscowDayText = (column: string) => sql<string>`to_char(${sql.ref(column)} AT TIME ZONE ${TIME.zone}, 'YYYY-MM-DD')`;

export const moscowHour = (column: string) => sql<number>`extract(hour FROM ${sql.ref(column)} AT TIME ZONE ${TIME.zone})`;

export const moscowWeekday = ({ column, weekStartsOn }: MoscowWeekdayInput) =>
  weekStartsOn === 'monday'
    ? sql<number>`(extract(isodow FROM ${sql.ref(column)} AT TIME ZONE ${TIME.zone}) - 1)`
    : sql<number>`extract(dow FROM ${sql.ref(column)} AT TIME ZONE ${TIME.zone})`;

export const percentile = ({ fraction, column }: PercentileInput) =>
  sql<number>`percentile_cont(${fraction}::float8) WITHIN GROUP (ORDER BY ${sql.ref(column)})`;

export const percentiles = ({ fractions, column }: PercentilesInput) =>
  sql<number[]>`percentile_cont(${fractions}::float8[]) WITHIN GROUP (ORDER BY ${sql.ref(column)})`;

export const unnestIntegers = (values: readonly number[]) => sql<number>`unnest(${values}::int[])`;

export const widthBucket = ({ column, thresholds }: WidthBucketInput) => sql<number>`width_bucket(${sql.ref(column)}, ${thresholds}::int[])`;

export const jsonbPathText = ({ column, path }: JsonbPathTextInput) =>
  sql<string | null>`(jsonb_path_query_first(${sql.ref(column)}, ${sql.lit(path)}) #>> '{}')`;

export const plusHours = ({ column, hours }: PlusHoursInput) => sql<Date>`(${sql.ref(column)} + make_interval(hours => ${hours}))`;

export const replayWithoutModBattle = (eb: ExpressionBuilder<DB, 'replay'>) =>
  eb.not(
    eb.exists(
      eb
        .selectFrom('battle')
        .select(eb.lit(1).as('found'))
        .whereRef('battle.account_id', '=', 'replay.account_id')
        .whereRef('battle.arena_unique_id', '=', 'replay.arena_unique_id')
    )
  );

export const valuesTable = <Row extends Record<string, unknown>, Alias extends string>({ rows, alias, types }: ValuesTableInput<Row, Alias>) => {
  const columns = Object.entries<ValuesColumnType>(types);
  const tuples = rows.map((row) => sql`(${sql.join(columns.map(([column, type]) => sql`CAST(${row[column]} AS ${sql.raw(type)})`))})`);

  return sql<Row>`(VALUES ${sql.join(tuples)})`.as<Alias>(sql`${sql.ref(alias)}(${sql.join(columns.map(([column]) => sql.ref(column)))})`);
};

export const trigramSimilar = ({ column, term }: TrigramSimilarInput) => sql<boolean>`${sql.ref(column)} % ${sql.ref(term)}`;
