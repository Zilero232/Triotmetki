import type { KeyboardEvent } from 'react';

import { useWindowEvent } from '@siberiacancode/reactuse';

import type { UseNavKeysInput } from './use-nav-keys.types';

import { NAV_SELECTORS } from '../../../config';
import { navFocusIndex } from '../../../lib';

export const useNavKeys = ({ sections, onSelect }: UseNavKeysInput) => {
  useWindowEvent('keydown', (event) => {
    const section = sections[Number(event.key) - 1];
    const isPlainCtrl = event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;

    if (!isPlainCtrl || section === undefined) {
      return;
    }

    event.preventDefault();
    onSelect(section);
  });

  return (event: KeyboardEvent<HTMLButtonElement>) => {
    const nav = event.currentTarget.closest(NAV_SELECTORS.container);
    const items = [...(nav?.querySelectorAll<HTMLButtonElement>(NAV_SELECTORS.item) ?? [])];
    const current = items.indexOf(event.currentTarget);
    const index = current === -1 ? null : navFocusIndex({ key: event.key, current, count: items.length });

    if (index === null) {
      return;
    }

    event.preventDefault();
    items[index]?.focus();
  };
};
