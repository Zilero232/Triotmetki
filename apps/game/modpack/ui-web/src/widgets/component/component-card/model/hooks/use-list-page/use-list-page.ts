import { useState } from 'react';

import type { RowChoice, RowDraft, UseListPageInput } from './use-list-page.types';

export const useListPage = ({ rows, onRun }: UseListPageInput) => {
  const [draft, setDraft] = useState<RowDraft | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const choose = ({ row, action }: RowChoice): void => {
    if (action.input === undefined || action.input === null) {
      onRun({ action, row });

      return;
    }

    setDraft({ row, action, value: action.input });
  };

  const submit = (): void => {
    if (draft) {
      onRun({ action: draft.action, row: draft.row, value: draft.value });
    }

    setDraft(null);
  };

  return rows.map((row) => ({
    row,
    hasDetails: (row.details?.length ?? 0) > 0 || (row.figure?.marks.length ?? 0) > 0 || Boolean(row.report),
    detailsOpen: openRow === row.id,
    draftValue: draft?.row === row.id ? draft.value : null,
    actions: row.actions.map((action) => ({ id: action.id, label: action.label, onClick: () => choose({ row: row.id, action }) })),
    toggleDetails: () => setOpenRow((current) => (current === row.id ? null : row.id)),
    editDraft: (value: string) => setDraft((current) => (current ? { ...current, value } : current)),
    submit,
    cancel: () => setDraft(null)
  }));
};
