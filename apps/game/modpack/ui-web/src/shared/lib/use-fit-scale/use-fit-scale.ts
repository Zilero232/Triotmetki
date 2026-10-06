import { useEventListener, useWindowEvent } from '@siberiacancode/reactuse';
import { useRef, useState } from 'react';

import type { FitPlacement } from '@/shared/lib/fit-scale';

import { fitPlacement } from '@/shared/lib/fit-scale';
import { useMeasureFrames } from '@/shared/lib/use-measure-frames';

import type { UseFitScaleInput } from './use-fit-scale.types';

import { FIT_SCALE } from './use-fit-scale.constants';

const sizeOf = (element: HTMLElement | null) => ({ width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 });

const isSame = (left: FitPlacement, right: FitPlacement): boolean =>
  left.scale === right.scale && left.x === right.x && left.y === right.y && left.measured === right.measured;

export const useFitScale = ({ content, max = 1, frames = FIT_SCALE.measureFrames }: UseFitScaleInput) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<FitPlacement>(FIT_SCALE.unmeasured);

  const measure = (): void => {
    const next = fitPlacement({ frame: sizeOf(frameRef.current), content: sizeOf(contentRef.current), max });

    setPlacement((current) => (isSame(current, next) ? current : next));
  };

  useMeasureFrames({ measure, frames, restartKey: content });
  useEventListener(contentRef, 'load', measure, { capture: true });
  useWindowEvent('resize', measure);

  return { frameRef, contentRef, ...placement };
};
