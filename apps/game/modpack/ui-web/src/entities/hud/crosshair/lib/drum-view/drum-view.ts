import type { CellStateInput, DrumCellState, DrumClip, DrumView, ShellMotion, ShellMotionInput } from './drum-view.types';

import { RETICLE_READOUTS } from '../../config';

const { drum } = RETICLE_READOUTS;

const cellState = ({ index, clip }: CellStateInput): DrumCellState => {
  if (index < clip.loaded) {
    return 'loaded';
  }

  return index === clip.loaded && clip.refill !== null ? 'refill' : 'spent';
};

export const drumView = (clip: DrumClip): DrumView => {
  if (clip.size > drum.rowLimit[clip.style]) {
    return { mode: 'count', density: 'full', cells: [] };
  }

  return {
    mode: 'row',
    density: clip.style === 'shells' && clip.size > drum.denseAbove ? 'dense' : 'full',
    cells: Array.from({ length: clip.size }, (_, index) => ({ index, state: cellState({ index, clip }) }))
  };
};

export const shellMotion = ({ index, loaded, previous }: ShellMotionInput): ShellMotion | null => {
  if (previous === undefined) {
    return null;
  }

  if (index >= loaded && index < previous) {
    return 'eject';
  }

  return index < loaded && index >= previous ? 'load' : null;
};
