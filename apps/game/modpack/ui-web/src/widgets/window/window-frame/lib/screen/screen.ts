import type { GamefaceBridge } from '@/shared/api/gameface';

import { gameface } from '@/shared/api/gameface';
import { designScreen, rootScale } from '@/shared/lib/design-screen';

import type { Viewport } from '../frame';

import { WINDOW_FRAME } from '../../config';

export const readViewport = (bridge: GamefaceBridge = gameface): Viewport => {
  const scale = bridge.remScale() ?? rootScale();
  const inner =
    window.innerWidth > 0 && window.innerHeight > 0
      ? { width: window.innerWidth / scale, height: window.innerHeight / scale }
      : WINDOW_FRAME.defaultScreen;

  const screen = bridge.clientSizeRem() ?? designScreen({ client: bridge.clientSize(), scale, fallback: inner });

  return { screen, view: bridge.viewRect() ?? { x: 0, y: 0, ...inner }, scale };
};
