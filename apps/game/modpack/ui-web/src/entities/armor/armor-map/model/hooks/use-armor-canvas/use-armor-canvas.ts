import { useWindowEvent } from '@siberiacancode/reactuse';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type { ArmorDrawReport, UseArmorCanvasInput, UseArmorCanvasResult } from './use-armor-canvas.types';

import { isSameScreen, readCanvasScreen } from '../../../lib/canvas-screen';
import { clearCells, drawCells } from '../../../lib/draw-cells';

const painterOf = (canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null => {
  if (canvas === null || typeof canvas.getContext !== 'function') {
    return null;
  }

  return canvas.getContext('2d');
};

export const useArmorCanvas = ({ map, onDrawn }: UseArmorCanvasInput): UseArmorCanvasResult => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState(readCanvasScreen);

  const report = useEffectEvent((drawn: ArmorDrawReport) => onDrawn?.(drawn));

  useWindowEvent('resize', () => {
    const next = readCanvasScreen();

    setScreen((current) => (isSameScreen(current, next) ? current : next));
  });

  useEffect(() => {
    const painter = painterOf(ref.current);
    const size = screen.pixels;

    if (painter === null) {
      return;
    }

    if (map === null) {
      clearCells({ painter, size });

      return;
    }

    const started = Date.now();
    const cells = drawCells({ painter, map, size });

    report({ width: size.width, height: size.height, cells, ms: Date.now() - started });
  }, [map, screen]);

  return { ref, screen };
};
