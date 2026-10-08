import { useEffect, useState } from 'react';

import type { CameraMove } from '@/features/viewer/orbit-camera';

import { gameface } from '@/shared/api/gameface';
import { onDistinct } from '@/shared/lib/on-distinct';

import type { ViewerSide, ViewerState } from '../../../lib/viewer-protocol';

import { footerOf, parseViewerState, sendViewer, sideLabelsOf } from '../../../lib/viewer-protocol';

export const useHitViewer = () => {
  const [state, setState] = useState<ViewerState | null>(null);

  useEffect(() => {
    gameface.fitView();

    const takeState = onDistinct((raw: string | null) => {
      const next = parseViewerState(raw);

      if (next) {
        setState(next);
      }
    });

    gameface.onDataChanged(() => {
      takeState(gameface.state());
    });

    sendViewer({ command: 'ready' });
  }, []);

  const pickHit = (index: number) => sendViewer({ command: 'select', index });
  const pickTab = (tab: ViewerSide) => sendViewer({ command: 'tab', tab });

  const switchTab = () => {
    const other = state?.tabs.find((tab) => tab.id !== state.tab && tab.count > 0);

    if (other) {
      pickTab(other.id);
    }
  };

  return {
    state,
    footer: state ? footerOf(state) : '',
    sideLabels: sideLabelsOf(state),
    selectedRow: state?.rows.find((row) => row.index === state.selected) ?? null,
    close: () => sendViewer({ command: 'close' }),
    move: (move: CameraMove) => sendViewer({ command: 'move', ...move }),
    describe: (text: string) => sendViewer({ command: 'diag', text }),
    pickBattle: (id: string) => sendViewer({ command: 'battle', id }),
    pickTab,
    pickHit,
    switchTab
  };
};
