import type { CSSProperties } from 'react';

import type { LampLayout, LampLayoutInput, LampRect } from './lamp-layout.types';

import { SIXTH_SENSE } from '../../config';

export const lampLayout = ({ ring, text, timer }: LampLayoutInput): LampLayout => {
  const textTop = ring + SIXTH_SENSE.text.gap;
  const secondsTop = text ? textTop + SIXTH_SENSE.text.height : ring;
  const height = timer ? secondsTop + SIXTH_SENSE.seconds.height : secondsTop;

  return {
    box: { left: 0, top: 0, width: ring, height },
    ring: { left: 0, top: 0, width: ring, height: ring },
    text: text ? { left: 0, top: textTop, width: ring, height: SIXTH_SENSE.text.height } : null,
    seconds: timer
      ? { left: (ring - SIXTH_SENSE.seconds.width) / 2, top: secondsTop, width: SIXTH_SENSE.seconds.width, height: SIXTH_SENSE.seconds.height }
      : null
  };
};

export const rectStyle = ({ left, top, width, height }: LampRect): CSSProperties => ({
  left: `${String(left)}rem`,
  top: `${String(top)}rem`,
  width: `${String(width)}rem`,
  height: `${String(height)}rem`
});
