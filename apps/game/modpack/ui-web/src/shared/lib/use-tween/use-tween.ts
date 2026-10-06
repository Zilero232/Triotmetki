import { useEffect, useRef, useState } from 'react';

import { easeOutCubic } from '@/shared/lib/easing';

import type { TweenAtInput, UseTweenInput } from './use-tween.types';

import { TWEEN } from './use-tween.constants';

export const tweenAt = ({ from, to, progress, step }: TweenAtInput): number => {
  if (progress >= 1) {
    return to;
  }

  return Math.round((from + (to - from) * easeOutCubic(Math.max(progress, 0))) / step) * step;
};

export const useTween = ({ value, step, durationMs = TWEEN.durationMs }: UseTweenInput): number | null => {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current ?? value;
    let frame: number | null = null;
    let startedAt: number | null = null;

    const tick = (now: number): void => {
      startedAt ??= now;

      const progress = (now - startedAt) / durationMs;
      const next = value === null || from === null ? value : tweenAt({ from, to: value, progress, step });

      shownRef.current = next;
      setShown(next);
      frame = progress >= 1 || next === value ? null : requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [value, step, durationMs]);

  return value === null ? null : (shown ?? value);
};
