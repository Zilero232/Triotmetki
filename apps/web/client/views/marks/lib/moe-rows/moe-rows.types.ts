import type { MoeRow, MoeSortField } from '@otmetki/schemas';

export type FilterByNameInput = {
  rows: MoeRow[];
  query: string;
};

export type ThresholdsMissingInput = {
  rows: MoeRow[];
  sort: MoeSortField;
  isComplete: boolean;
};
