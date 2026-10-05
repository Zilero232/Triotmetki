'use client';

import { loadCommandPalette } from '../../../lib/palette-chunk';
import { useCommandPalette } from '../../context';

export const useCommandPaletteTrigger = (onOpen?: () => void) => {
  const { setOpen } = useCommandPalette();

  return {
    open: () => {
      onOpen?.();
      setOpen(true);
    },
    preload: () => void loadCommandPalette()
  };
};
