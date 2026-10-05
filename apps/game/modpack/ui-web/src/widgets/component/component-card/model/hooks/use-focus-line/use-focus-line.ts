import { useEffect, useRef, useState } from 'react';

import { EDITOR } from '../../../config';

const offsetIn = (line: HTMLElement, frame: HTMLElement): number => line.getBoundingClientRect().top - frame.getBoundingClientRect().top;

export const useFocusLine = (focusKey: string | null) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  useEffect(() => {
    if (focusKey === null) {
      return undefined;
    }

    let left = EDITOR.focusFrames;
    let frame = 0;

    const measure = () => {
      const line = lineRef.current;
      const box = frameRef.current;

      if (line && box) {
        setTop(Math.max(0, Math.round(offsetIn(line, box) - EDITOR.focusMargin)));
      }

      left -= 1;
      frame = left > 0 ? requestAnimationFrame(measure) : 0;
    };

    frame = requestAnimationFrame(measure);

    return () => cancelAnimationFrame(frame);
  }, [focusKey]);

  return { frameRef, lineRef, top };
};
