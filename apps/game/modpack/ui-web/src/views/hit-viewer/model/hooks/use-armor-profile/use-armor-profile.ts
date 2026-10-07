import { useState } from 'react';

export const useArmorProfile = () => {
  const [isOpen, setIsOpen] = useState(true);

  return { isOpen, toggle: () => setIsOpen((open) => !open) };
};
