import { useLayoutEffect, useRef } from 'react';

import type { UseMeasureFramesInput } from './use-measure-frames.types';

export const useMeasureFrames = ({ measure, frames, restartKey, isEnabled = true, skipsFirst = false }: UseMeasureFramesInput): void => {
  const measureRef = useRef(measure);

  measureRef.current = measure;

  useLayoutEffect(() => {
    if (!isEnabled) {
      return undefined;
    }

    let left = frames;
    let frame = 0;

    const step = (): void => {
      measureRef.current();
      left -= 1;
      frame = left > 0 ? requestAnimationFrame(step) : 0;
    };

    if (!skipsFirst) {
      measureRef.current();
    }

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [restartKey, frames, isEnabled, skipsFirst]);
};
