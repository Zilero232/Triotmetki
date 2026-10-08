import { usePrevious } from '@siberiacancode/reactuse';

import type { DrumMotion, DrumMotionInput, DrumReading } from './use-drum-motion.types';

import { shellMotion } from '../../../lib/drum-view';

const isSameReading = (left: DrumReading, right: DrumReading): boolean => left.loaded === right.loaded && left.size === right.size;

export const useDrumMotion = ({ loaded, size }: DrumMotionInput): DrumMotion => {
  const previous = usePrevious<DrumReading>({ loaded, size }, { equality: isSameReading });
  const isSameDrum = previous?.size === size;
  const previousLoaded = isSameDrum ? previous.loaded : undefined;

  return (index) => shellMotion({ index, loaded, previous: previousLoaded });
};
