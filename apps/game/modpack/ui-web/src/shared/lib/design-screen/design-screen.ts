import type { ClientSize } from '@/shared/api/gameface';

import type { DesignScreenInput } from './design-screen.types';

import { HUD_SCREEN } from './design-screen.constants';

export const parseScale = (fontSize: string): number => {
  const parsed = Number.parseFloat(fontSize);

  return Number.isFinite(parsed) && parsed >= HUD_SCREEN.minScale && parsed <= HUD_SCREEN.maxScale ? parsed : HUD_SCREEN.fallbackScale;
};

export const rootScale = (): number => parseScale(getComputedStyle(document.documentElement).fontSize);

export const designScreen = ({ client, scale, fallback }: DesignScreenInput): ClientSize =>
  client && client.width > 0 && client.height > 0 ? { width: client.width / scale, height: client.height / scale } : fallback;
