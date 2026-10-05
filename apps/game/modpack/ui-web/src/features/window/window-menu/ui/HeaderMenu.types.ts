import type { Language } from '@/shared/i18n';

export type MenuFrame = {
  zoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  onReset: () => void;
};

export type HeaderMenuProps = {
  frame: MenuFrame;
  language: Language;
};
