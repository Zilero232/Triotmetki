import type { UiAction, UiRow } from '@/shared/api/protocol';

import type { RunActionInput } from '../use-card-actions';
import type { useListPage } from './use-list-page';

export type UseListPageInput = {
  rows: UiRow[];
  onRun: (input: RunActionInput) => void;
};

export type RowChoice = {
  row: string;
  action: UiAction;
};

export type RowDraft = RowChoice & {
  value: string;
};

export type ListPageRowModel = ReturnType<typeof useListPage>[number];
