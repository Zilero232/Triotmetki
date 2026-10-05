import { useWindowEvent } from '@siberiacancode/reactuse';
import { useLayoutEffect, useRef, useState } from 'react';

import { fitScale } from '@/shared/lib/fit-scale';

const sizeOf = (element: HTMLElement | null) => ({ width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 });

export const useFitScale = () => {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const measureRef = useRef(() => {
    const next = fitScale({ frame: sizeOf(frameRef.current), content: sizeOf(contentRef.current) });

    setScale((current) => (current === next ? current : next));
  });

  useLayoutEffect(() => {
    measureRef.current();
  });

  useWindowEvent('resize', () => measureRef.current());

  return { frameRef, contentRef, scale };
};
