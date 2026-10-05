'use client';

import { useHotkeys, useWindowEvent } from '@siberiacancode/reactuse';

import { isTypingTarget } from '@/shared/lib';

import { COMMAND_PALETTE } from '../../../config';

export const useCommandPaletteHotkey = (onToggle: () => void) => {
  useHotkeys(COMMAND_PALETTE.hotkeyTarget, 'mod+k', onToggle);

  useWindowEvent('keydown', (event) => {
    if (event.key !== '/' || isTypingTarget(event.target)) {
      return;
    }

    event.preventDefault();
    onToggle();
  });
};
