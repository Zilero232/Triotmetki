import { useWindowEvent } from '@siberiacancode/reactuse';

import type { UseViewerKeysInput } from './use-viewer-keys.types';

import { HIT_VIEWER } from '../../../config';

export const useViewerKeys = ({ onStep, onSwitchTab }: UseViewerKeysInput) => {
  useWindowEvent('keydown', (event) => {
    const { keys } = HIT_VIEWER;

    if (event.key === keys.previous || event.key === keys.next) {
      event.preventDefault();
      onStep(event.key === keys.next ? 1 : -1);

      return;
    }

    if (event.key === keys.tab) {
      event.preventDefault();
      onSwitchTab();
    }
  });
};
