import { usePrevious } from '@siberiacancode/reactuse';

import type { DrumMotion } from './use-drum-motion.types';

import { shellMotion } from '../../../lib/drum-view';

export const useDrumMotion = (loaded: number): DrumMotion => {
  const previous = usePrevious(loaded);

  return (index) => shellMotion({ index, loaded, previous });
};
