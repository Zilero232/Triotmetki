import type { STAT_SUM_COLUMN } from './sql-expressions.constants';

export type StatSumAlias = keyof typeof STAT_SUM_COLUMN;

export type MoscowBucketInput = {
  granularity: 'day' | 'month' | 'week';
  column: string;
};

export type MoscowWeekdayInput = {
  column: string;
  weekStartsOn: 'monday' | 'sunday';
};

export type PercentileInput = {
  fraction: number;
  column: string;
};

export type PlusHoursInput = {
  column: string;
  hours: number;
};

export type ValuesColumnType = 'bigint' | 'integer' | 'smallint' | 'text' | 'timestamptz';

export type ValuesTableInput<Row extends Record<string, unknown>, Alias extends string> = {
  rows: readonly Row[];
  alias: Alias;
  types: { [Column in keyof Row & string]: ValuesColumnType };
};

export type PercentilesInput = {
  fractions: readonly number[];
  column: string;
};

export type WidthBucketInput = {
  column: string;
  thresholds: readonly number[];
};

export type JsonbPathTextInput = {
  column: string;
  path: string;
};

export type TrigramSimilarInput = {
  column: string;
  term: string;
};
