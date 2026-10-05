import type { ClientSize } from '@/shared/api/gameface';

import { gameface } from '@/shared/api/gameface';
import { designScreen, rootScale } from '@/shared/lib/design-screen';

import { PANEL_LAYOUT } from '../../config';

export const screenScale = (): number => gameface.remScale() ?? rootScale();

export const readScreen = (): ClientSize => {
  const scale = screenScale();
  const fallback =
    window.innerWidth > 0 && window.innerHeight > 0
      ? { width: window.innerWidth / scale, height: window.innerHeight / scale }
      : PANEL_LAYOUT.defaultScreen;

  return designScreen({ client: gameface.clientSize(), scale, fallback });
};
