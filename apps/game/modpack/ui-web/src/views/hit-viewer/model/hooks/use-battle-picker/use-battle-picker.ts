import { useState } from 'react';

import { useWheelScroll } from '@/shared/lib/use-wheel-scroll';

export const useBattlePicker = (onPick: (id: string) => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useWheelScroll();

  return {
    isOpen,
    listRef,
    toggle: () => setIsOpen((open) => !open),
    pick: (id: string) => {
      setIsOpen(false);
      onPick(id);
    }
  };
};
