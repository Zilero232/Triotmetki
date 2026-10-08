import { gameface } from '@/shared/api/gameface';

import type { CanvasScreen } from './canvas-screen.types';

const windowSize = () => ({ width: window.innerWidth, height: window.innerHeight });

export const readCanvasScreen = (): CanvasScreen => {
  const rem = gameface.clientSizeRem() ?? windowSize();
  const scale = gameface.remScale() ?? 1;
  const pixels = { width: Math.round(rem.width * scale), height: Math.round(rem.height * scale) };

  return { rem, pixels };
};

export const isSameScreen = (first: CanvasScreen, second: CanvasScreen): boolean =>
  first.pixels.width === second.pixels.width && first.pixels.height === second.pixels.height;
