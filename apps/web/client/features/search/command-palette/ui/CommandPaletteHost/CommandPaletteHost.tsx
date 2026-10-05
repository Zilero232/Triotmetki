'use client';

import dynamic from 'next/dynamic';

import { loadCommandPalette } from '../../lib/palette-chunk';
import { useCommandPalette } from '../../model/context';

const CommandPalette = dynamic(loadCommandPalette, { ssr: false });

export const CommandPaletteHost = () => {
  const { hasOpened } = useCommandPalette();

  return hasOpened ? <CommandPalette /> : null;
};
