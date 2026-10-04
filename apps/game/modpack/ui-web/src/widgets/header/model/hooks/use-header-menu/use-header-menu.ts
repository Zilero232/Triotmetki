import { useBoolean, useClickOutside } from '@siberiacancode/reactuse';

import type { UseHeaderMenuInput } from './use-header-menu.types';

import { useEscapeLayer } from '../../../../../shared/lib/use-escape-layer';

export const useHeaderMenu = ({ onReset }: UseHeaderMenuInput) => {
  const [isOpen, toggle] = useBoolean(false);
  const close = () => toggle(false);
  const ref = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) {
      close();
    }
  });

  useEscapeLayer({ kind: 'popover', active: isOpen, onEscape: close });

  return {
    ref,
    isOpen,
    toggle: () => toggle(),
    reset: () => {
      onReset();
      close();
    }
  };
};
