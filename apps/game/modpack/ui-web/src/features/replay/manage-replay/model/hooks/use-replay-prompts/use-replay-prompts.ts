import { useState } from 'react';

import type { ReplayItem } from '@/entities/replay/replay';

import { REPLAYS } from '@/entities/replay/replay';
import { useEscapeLayer } from '@/shared/lib/use-escape-layer';

import type { PendingAction, RenameDraft } from './use-replay-prompts.types';

import { runReplayAction } from '../../actions';

export const useReplayPrompts = () => {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [draft, setDraft] = useState<RenameDraft | null>(null);

  useEscapeLayer({ kind: 'confirm', active: pending !== null, onEscape: () => setPending(null) });
  useEscapeLayer({ kind: 'field', active: draft !== null, onEscape: () => setDraft(null) });

  const ask = (action: PendingAction): void => {
    setDraft(null);
    setPending(action);
  };

  return {
    pendingFor: (selected: ReplayItem | null) => (pending && pending.id === selected?.id ? pending.kind : null),
    draftFor: (selected: ReplayItem | null) => (draft && draft.id === selected?.id ? draft.value : null),
    dismiss: () => {
      setPending(null);
      setDraft(null);
    },
    askWatch: (item: ReplayItem) => ask({ kind: 'watch', id: item.id }),
    askRemove: (item: ReplayItem) => ask({ kind: 'remove', id: item.id }),
    confirm: () => {
      if (pending) {
        runReplayAction({ action: pending.kind === 'watch' ? REPLAYS.actions.play : REPLAYS.actions.remove, row: pending.id });
      }

      setPending(null);
    },
    cancel: () => setPending(null),
    startRename: (item: ReplayItem) => {
      setPending(null);
      setDraft({ id: item.id, value: item.title });
    },
    editRename: (value: string) => setDraft((current) => (current ? { ...current, value } : current)),
    submitRename: () => {
      if (draft && draft.value.trim() !== '') {
        runReplayAction({ action: REPLAYS.actions.rename, row: draft.id, value: draft.value.trim() });
      }

      setDraft(null);
    },
    cancelRename: () => setDraft(null)
  };
};
