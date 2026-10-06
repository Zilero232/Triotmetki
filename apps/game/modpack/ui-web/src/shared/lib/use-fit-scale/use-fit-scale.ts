import { useEventListener, useWindowEvent } from '@siberiacancode/reactuse';
import { useLayoutEffect, useRef, useState } from 'react';
import { isShallowEqual } from 'remeda';

import type { FitPlacement } from '@/shared/lib/fit-scale';

import { elementSize, fitPlacement } from '@/shared/lib/fit-scale';
import { useMeasureFrames } from '@/shared/lib/use-measure-frames';

import type { UseFitScaleInput } from './use-fit-scale.types';

import { FIT_SCALE } from './use-fit-scale.constants';

export const useFitScale = ({ contentKey, max = 1, frames = FIT_SCALE.measureFrames }: UseFitScaleInput) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<FitPlacement>(FIT_SCALE.unmeasured);

  const measure = (): void => {
    const next = fitPlacement({ frame: elementSize(frameRef.current), content: elementSize(contentRef.current), max });

    setPlacement((current) => (isShallowEqual(current, next) ? current : next));
  };

  const measureRef = useRef(measure);

  measureRef.current = measure;

  useLayoutEffect(() => measureRef.current());
  useMeasureFrames({ measure, frames, restartKey: JSON.stringify([contentKey, max]) });
  useEventListener(contentRef, 'load', measure, { capture: true });
  useWindowEvent('resize', measure);

  return { frameRef, contentRef, ...placement };
};
