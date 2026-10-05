import { useWindowEvent } from '@siberiacancode/reactuse';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { FitPlacement } from '@/shared/lib/fit-scale';

import { fitPlacement } from '@/shared/lib/fit-scale';

import type { UseFitScaleInput } from './use-fit-scale.types';

import { FIT_SCALE } from './use-fit-scale.constants';

const sizeOf = (element: HTMLElement | null) => ({ width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 });

const isSame = (left: FitPlacement, right: FitPlacement): boolean =>
  left.scale === right.scale && left.x === right.x && left.y === right.y && left.measured === right.measured;

export const useFitScale = ({ max = 1, frames = FIT_SCALE.measureFrames }: UseFitScaleInput = {}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<FitPlacement>(FIT_SCALE.unmeasured);
  const measureRef = useRef(() => {});

  measureRef.current = () => {
    const next = fitPlacement({ frame: sizeOf(frameRef.current), content: sizeOf(contentRef.current), max });

    setPlacement((current) => (isSame(current, next) ? current : next));
  };

  useLayoutEffect(() => {
    let left = frames;
    let frame = 0;

    const step = () => {
      measureRef.current();
      left -= 1;
      frame = left > 0 ? requestAnimationFrame(step) : 0;
    };

    measureRef.current();
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  });

  useEffect(() => {
    const content = contentRef.current;
    const onLoad = () => measureRef.current();

    content?.addEventListener('load', onLoad, true);

    return () => content?.removeEventListener('load', onLoad, true);
  }, []);

  useWindowEvent('resize', () => measureRef.current());

  return { frameRef, contentRef, ...placement };
};
