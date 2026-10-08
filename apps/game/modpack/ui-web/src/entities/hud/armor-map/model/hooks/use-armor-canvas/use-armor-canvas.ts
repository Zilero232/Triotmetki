import { useWindowEvent } from '@siberiacancode/reactuse';
import { useEffect, useRef, useState } from 'react';

import type { ArmorMapData } from '../../schemas';
import type { UseArmorCanvasResult } from './use-armor-canvas.types';

import { isSameScreen, readCanvasScreen } from '../../../lib/canvas-screen';
import { drawCells } from '../../../lib/draw-cells';

const painterOf = (canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null => {
  if (canvas === null || typeof canvas.getContext !== 'function') {
    return null;
  }

  return canvas.getContext('2d');
};

export const useArmorCanvas = (map: ArmorMapData): UseArmorCanvasResult => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState(readCanvasScreen);

  useWindowEvent('resize', () => {
    const next = readCanvasScreen();

    setScreen((current) => (isSameScreen(current, next) ? current : next));
  });

  useEffect(() => {
    const painter = painterOf(ref.current);

    if (painter !== null) {
      drawCells({ painter, map, size: screen.pixels });
    }
  }, [map, screen]);

  return { ref, screen };
};
