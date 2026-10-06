import { useState } from 'react';

export const useBattlePicker = (onPick: (id: string) => void) => {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    toggle: () => setIsOpen((open) => !open),
    pick: (id: string) => {
      setIsOpen(false);
      onPick(id);
    }
  };
};
