import { useEffect, useState } from 'react';

import type { ViewerMarks, ViewerSide, ViewerState } from '../../../lib/viewer-protocol';

import { gameface } from '../../../../../shared/api/gameface';
import { onDistinct } from '../../../../../shared/lib/on-distinct';
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

  return {
    state,
    marks,
    footer: state ? footerOf(state) : '',
    close: () => sendViewer({ command: 'close' }),
    pickBattle: (id: string) => sendViewer({ command: 'battle', id }),
    pickTab: (tab: ViewerSide) => sendViewer({ command: 'tab', tab }),
    pickHit: (index: number) => sendViewer({ command: 'select', index })
  };
};
