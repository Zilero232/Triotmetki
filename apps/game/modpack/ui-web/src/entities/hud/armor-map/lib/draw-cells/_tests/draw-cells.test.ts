import { describe, expect, it } from 'vitest';

import type { ArmorMapData } from '../../../model/schemas';

import { ARMOR_MAP } from '../../../config';
import { cellRect, drawCells } from '../draw-cells';

const SIZE = { width: 1000, height: 500 };

const MAP: ArmorMapData = { cols: 2, rows: 2, left: 0.2, top: 0.4, width: 0.4, height: 0.2, cells: '1007', mode: 'nominal', opacity: 0.6 };

const HATCHED = ARMOR_MAP.alphabet.charAt(1 + ARMOR_MAP.patternStep * ARMOR_MAP.pattern.screen);

class Recorder {
  readonly rects: number[][] = [];

  readonly alphas: number[] = [];

  fillStyle = '';

  private alpha = 1;

  get globalAlpha(): number {
    return this.alpha;
  }

  set globalAlpha(value: number) {
    this.alpha = value;
    this.alphas.push(value);
  }

  clearRect = (): void => undefined;

  fillRect = (x: number, y: number, width: number, height: number): void => {
    this.rects.push([x, y, width, height]);
  };
}

describe(cellRect, () => {
  it('places the first cell at the box corner on the screen', () => {
    expect(cellRect({ map: MAP, size: SIZE, index: 0 })).toEqual({ x: 200, y: 200, width: 200, height: 50 });
  });

  it('places a cell of the second row below the first', () => {
    expect(cellRect({ map: MAP, size: SIZE, index: 2 }).y).toBe(250);
  });
});

describe(drawCells, () => {
  it('fills only the cells with armour', () => {
    const painter = new Recorder();

    drawCells({ painter, map: MAP, size: SIZE });

    expect(painter.rects).toHaveLength(2);
  });

  it('draws at the map opacity and gives the canvas back opaque', () => {
    const painter = new Recorder();

    drawCells({ painter, map: MAP, size: SIZE });

    expect(painter.alphas).toEqual([MAP.opacity, 1]);
  });

  it('adds a hatch over a hatched cell on its diagonal', () => {
    const painter = new Recorder();

    drawCells({ painter, map: { ...MAP, cells: HATCHED.concat('000') }, size: SIZE });

    expect(painter.rects).toHaveLength(2);
  });

  it('never reads past the grid', () => {
    const painter = new Recorder();

    drawCells({ painter, map: { ...MAP, cells: '11111111' }, size: SIZE });

    expect(painter.rects).toHaveLength(4);
  });
});
