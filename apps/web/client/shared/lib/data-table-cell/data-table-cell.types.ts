import type { Cell, ColumnMeta } from '@tanstack/react-table';

import type { RankMedal } from '../rank-medal/rank-medal.types';

export type DataTableCellInput<T> = {
  cell: Cell<T, unknown>;
  barMax: Readonly<Record<string, number>>;
};

export type DataTableCellBar = {
  value: number;
  max: number;
  tone: NonNullable<ColumnMeta<unknown, unknown>['bar']>['tone'];
};

export type DataTableCellView = Pick<ColumnMeta<unknown, unknown>, 'hideBelow' | 'isMedia' | 'isNumeric' | 'isRank' | 'isSticky' | 'showBelow'> & {
  align: NonNullable<ColumnMeta<unknown, unknown>['align']>;
  isSorted: boolean;
  medal: RankMedal | undefined;
  bar: DataTableCellBar | null;
};
