import { useWindowEvent } from '@siberiacancode/reactuse';

import type { UseViewerKeysInput } from './use-viewer-keys.types';

import { HIT_VIEWER } from '../../../config';
import { stepOfKey } from '../../../lib/hit-step';

export const useViewerKeys = ({ onStep, onSwitchTab }: UseViewerKeysInput) => {
  useWindowEvent('keydown', (event) => {
    const step = stepOfKey(event.key);

    if (step !== null) {
      event.preventDefault();
      onStep(step);

      return;
    }

    if (event.key === HIT_VIEWER.keys.tab) {
      event.preventDefault();
      onSwitchTab();
    }
  });
};
