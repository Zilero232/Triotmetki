import { useRef, useState } from 'react';

import { useMeasureFrames } from '@/shared/lib/use-measure-frames';

import type { OffsetInput } from './use-focus-line.types';

import { EDITOR } from '../../../config';

const offsetIn = ({ line, frame }: OffsetInput): number => line.getBoundingClientRect().top - frame.getBoundingClientRect().top;

export const useFocusLine = (focusKey: string | null) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  const measure = (): void => {
    const line = lineRef.current;
    const frame = frameRef.current;

    if (!line || !frame) {
      return;
    }

    const offset = offsetIn({ line, frame }) - EDITOR.focusMargin;

    setTop(Math.max(0, Math.round(offset)));
  };

  useMeasureFrames({ measure, frames: EDITOR.focusFrames, restartKey: focusKey, isEnabled: focusKey !== null, skipsFirst: true });

  return { frameRef, lineRef, top };
};
