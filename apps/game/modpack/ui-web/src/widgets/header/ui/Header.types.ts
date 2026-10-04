import type { RefObject } from 'react';

import type { Language } from '../../../shared/i18n';

export type HeaderFrame = {
  zoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  handles: { move: RefObject<HTMLDivElement | null> };
  onRecentre: () => void;
  onReset: () => void;
};

export type HeaderProps = {
  language: Language;
  compact: boolean;
  frame: HeaderFrame;
};
