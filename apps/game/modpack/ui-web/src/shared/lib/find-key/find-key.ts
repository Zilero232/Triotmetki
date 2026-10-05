import { KEYS } from '@/shared/config';

import type { BindFindKeyInput, FindKey } from './find-key.types';

export const isFindKey = (event: FindKey): boolean => {
  if (!event.ctrlKey) {
    return false;
  }

  return event.keyCode === KEYS.findCode || String(event.key).toLowerCase() === KEYS.find;
};

export const bindFindKey = ({ root, onFind }: BindFindKeyInput): (() => void) => {
  const listener = (event: KeyboardEvent): void => {
    if (!isFindKey(event)) {
      return;
    }

    event.preventDefault();
    onFind();
  };

  root.addEventListener('keydown', listener);

  return () => root.removeEventListener('keydown', listener);
};
