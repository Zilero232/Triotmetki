import { useEventListener, useWindowEvent } from '@siberiacancode/reactuse';
import { useRef, useState } from 'react';

import type { UseDistanceSliderInput } from './use-distance-slider.types';

import { ARMOR_VIEWER } from '../../../config';
import { distanceAt, fractionOf } from '../../../lib/distance-scale';

export const useDistanceSlider = ({ value, limits, onCommit }: UseDistanceSliderInput) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);

  const valueAt = (clientX: number): number | null => {
    const rect = trackRef.current?.getBoundingClientRect();

    if (!rect || rect.width <= 0) {
      return null;
    }

    return distanceAt({ fraction: (clientX - rect.left) / rect.width, limits, step: ARMOR_VIEWER.distanceStep });
  };

  const downRef = useEventListener<HTMLDivElement, 'mousedown'>('mousedown', (event) => {
    event.stopPropagation();
    setDragged(valueAt(event.clientX));
  });

  useWindowEvent('mousemove', (event) => {
    if (dragged !== null) {
      setDragged(valueAt(event.clientX) ?? dragged);
    }
  });

  useWindowEvent('mouseup', () => {
    if (dragged === null) {
      return;
    }

    setDragged(null);

    if (dragged !== value) {
      onCommit(dragged);
    }
  });

  const shown = dragged ?? value;

  return {
    trackRef: (node: HTMLDivElement) => {
      trackRef.current = node;
      downRef(node);
    },
    shown,
    fill: `${String(fractionOf({ value: shown, limits }) * 100)}%`
  };
};
