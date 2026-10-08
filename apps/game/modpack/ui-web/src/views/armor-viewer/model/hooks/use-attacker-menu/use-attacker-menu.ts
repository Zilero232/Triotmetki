import { useState } from 'react';

import { useEscapeLayer } from '@/shared/lib/use-escape-layer';

export const useAttackerMenu = (onPick: (cd: number) => void) => {
  const [isOpen, setIsOpen] = useState(false);

  useEscapeLayer({ kind: 'popover', active: isOpen, onEscape: () => setIsOpen(false) });

  return {
    isOpen,
    toggle: () => setIsOpen((open) => !open),
    pick: (cd: number) => {
      setIsOpen(false);
      onPick(cd);
    }
  };
};
