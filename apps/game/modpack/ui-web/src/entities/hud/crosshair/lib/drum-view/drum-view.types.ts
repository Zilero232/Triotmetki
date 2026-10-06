import type { DrumData } from '../../model/schemas';

export type DrumClip = Pick<DrumData, 'loaded' | 'refill' | 'size' | 'style'>;

export type DrumCellState = 'loaded' | 'refill' | 'spent';

export type DrumCell = { index: number; state: DrumCellState };

export type DrumView = {
  mode: 'count' | 'row';
  density: 'dense' | 'full';
  cells: DrumCell[];
};

export type ShellMotion = 'eject' | 'load';

export type ShellMotionInput = {
  index: number;
  loaded: number;
  previous: number | undefined;
};

export type CellStateInput = { index: number; clip: DrumClip };
