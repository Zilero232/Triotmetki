import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';

import type { UndoEntry } from '@/entities/window/window-state';

import { $undo, undoLast, useT } from '@/entities/window/window-state';

import { UNDO_TOAST } from '../../../config';

export const useUndoToast = () => {
  const t = useT();
  const stack = useStore($undo);
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  const last = stack.at(-1) ?? null;
  const lastId = last?.id ?? null;

  const describe = (entry: UndoEntry): string => {
    if (entry.kind === 'switch') {
      return entry.switchedOn ? t('on') : t('off');
    }

    return entry.kind === 'reset' ? t('undoReset') : `${entry.label}. ${t('undoChanged')}`;
  };

  useEffect(() => {
    if (lastId === null) {
      return;
    }

    const timer = setTimeout(setHiddenId, UNDO_TOAST.hideMs, lastId);

    return () => clearTimeout(timer);
  }, [lastId]);

  return {
    visible: last !== null && hiddenId !== last.id,
    text: last ? `${last.title}: ${describe(last)}` : '',
    undoLabel: stack.length > 1 ? `${t('undo')} (${stack.length})` : t('undo'),
    undo: undoLast,
    dismiss: () => setHiddenId(lastId)
  };
};
