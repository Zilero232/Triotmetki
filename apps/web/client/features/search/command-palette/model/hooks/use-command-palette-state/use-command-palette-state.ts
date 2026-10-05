'use client';

import { useBoolean } from '@siberiacancode/reactuse';

import type { CommandPaletteContextValue } from '../../context';

import { useCommandPaletteHotkey } from '../use-command-palette-hotkey';

export const useCommandPaletteState = (): CommandPaletteContextValue => {
  const [isOpen, toggleOpen] = useBoolean(false);
  const [hasOpened, markOpened] = useBoolean(false);

  useCommandPaletteHotkey(() => {
    markOpened(true);
    toggleOpen();
  });

  const setOpen = (next: boolean) => {
    if (next) {
      markOpened(true);
    }

    toggleOpen(next);
  };

  return { isOpen, hasOpened, setOpen };
};
