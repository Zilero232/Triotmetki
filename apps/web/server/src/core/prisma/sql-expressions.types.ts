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
