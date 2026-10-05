import { useEffect, useState } from 'react';

import { gameface } from '@/shared/api/gameface';
import { onDistinct } from '@/shared/lib/on-distinct';

import type { CameraMove } from '../../../lib/camera-move';
import type { ViewerMarks, ViewerSide, ViewerState } from '../../../lib/viewer-protocol';

import { hitStep } from '../../../lib/hit-step';
import { footerOf, parseViewerMarks, parseViewerState, sendViewer } from '../../../lib/viewer-protocol';

export const useHitViewer = () => {
  const [state, setState] = useState<ViewerState | null>(null);
  const [marks, setMarks] = useState<ViewerMarks | null>(null);

  useEffect(() => {
    gameface.fitView();

    const takeState = onDistinct((raw: string | null) => {
      const next = parseViewerState(raw);

      if (next) {
        setState(next);
      }
    });

    const takeMarks = onDistinct((raw: string | null) => setMarks(parseViewerMarks(raw)));

    gameface.onDataChanged(() => {
      takeState(gameface.state());
      takeMarks(gameface.feed());
    });

    sendViewer({ command: 'ready' });
  }, []);

  const pickHit = (index: number) => sendViewer({ command: 'select', index });
  const pickTab = (tab: ViewerSide) => sendViewer({ command: 'tab', tab });

  const stepHit = (step: -1 | 1) => {
    const next = state ? hitStep({ indexes: state.rows.map((row) => row.index), selected: state.selected, step }) : null;

    if (next !== null) {
      pickHit(next);
    }
  };

  const switchTab = () => {
    const other = state?.tabs.find((tab) => tab.id !== state.tab && tab.count > 0);

    if (other) {
      pickTab(other.id);
    }
  };

  return {
    state,
    marks,
    footer: state ? footerOf(state) : '',
    selectedRow: state?.rows.find((row) => row.index === state.selected) ?? null,
    close: () => sendViewer({ command: 'close' }),
    move: (move: CameraMove) => sendViewer({ command: 'move', ...move }),
    pickBattle: (id: string) => sendViewer({ command: 'battle', id }),
    pickTab,
    pickHit,
    stepHit,
    switchTab
  };
};
