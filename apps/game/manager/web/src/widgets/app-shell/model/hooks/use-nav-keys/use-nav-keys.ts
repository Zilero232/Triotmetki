import type { KeyboardEvent } from 'react';

import { useEffect, useEffectEvent } from 'react';

import type { UseNavKeysInput } from './use-nav-keys.types';

import { navFocusIndex } from '../../../lib';

export const useNavKeys = ({ sections, onSelect }: UseNavKeysInput) => {
  const select = useEffectEvent(onSelect);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const section = sections[Number(event.key) - 1];
      const isPlainCtrl = event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;

      if (!isPlainCtrl || section === undefined) {
        return;
      }

      event.preventDefault();
      select(section);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sections]);

  return (event: KeyboardEvent<HTMLButtonElement>) => {
    const items = [...(event.currentTarget.closest('nav')?.querySelectorAll<HTMLButtonElement>('button[data-nav-item]') ?? [])];
    const current = items.indexOf(event.currentTarget);
    const index = current === -1 ? null : navFocusIndex({ key: event.key, current, count: items.length });

    if (index === null) {
      return;
    }

    event.preventDefault();
    items[index]?.focus();
  };
};
