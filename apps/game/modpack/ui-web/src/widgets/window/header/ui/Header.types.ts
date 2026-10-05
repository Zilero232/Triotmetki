import type { RefObject } from 'react';

import type { MenuFrame } from '@/features/window/window-menu';
import type { Language } from '@/shared/i18n';

export type HeaderFrame = MenuFrame & {
  handles: { move: RefObject<HTMLDivElement | null> };
  onRecentre: () => void;
};

export type HeaderProps = {
  language: Language;
  compact: boolean;
  frame: HeaderFrame;
};
