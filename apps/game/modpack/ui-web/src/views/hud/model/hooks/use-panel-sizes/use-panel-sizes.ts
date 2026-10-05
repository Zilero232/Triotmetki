import { useLayoutEffect, useRef, useState } from 'react';
import { isDeepEqual } from 'remeda';

import type { Measured } from '@/entities/hud/panel-layout';

import { screenScale, stickySize } from '@/entities/hud/panel-layout';
import { widgetLines } from '@/features/hud/widget-registry';

import type { MeasureRef, SettleInput, Sizes, UsePanelSizesInput } from './use-panel-sizes.types';

import { HUD_OVERLAY } from '../../../config';

const settle = ({ current, readings }: SettleInput): Sizes => {
  const measured: Sizes = { ...current };
  let changed = false;

  readings.forEach((next, id) => {
    const size = stickySize({ previous: current[id], next });

    measured[id] = size;
    changed = changed || !isDeepEqual(current[id], size);
  });

  return changed ? measured : current;
};

export const usePanelSizes = ({ lines, widgets }: UsePanelSizesInput) => {
  const [sizes, setSizes] = useState<Sizes>({});
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const measureRefsRef = useRef(new Map<string, MeasureRef>());

  useLayoutEffect(() => {
    const measure = (): void => {
      const scale = screenScale();
      const readings = new Map<string, Measured>();

      elementsRef.current.forEach((element, id) => {
        if (element.offsetWidth <= 0 || element.offsetHeight <= 0) {
          return;
        }

        const resolved = widgets.get(id);
        const count = resolved ? widgetLines(resolved) : (lines.get(id)?.length ?? 0);

        readings.set(id, { lines: count, width: element.offsetWidth / scale, height: element.offsetHeight / scale });
      });

      // eslint-disable-next-line react/set-state-in-effect -- the labels' sizes are only known after layout, and Gameface lays out a few frames later; it settles once nothing grows
      setSizes((current) => settle({ current, readings }));
    };

    let left = HUD_OVERLAY.measureFrames;
    let frame = 0;

    const onFrame = (): void => {
      left -= 1;
      measure();

      if (left > 0) {
        frame = requestAnimationFrame(onFrame);
      }
    };

    measure();
    frame = requestAnimationFrame(onFrame);

    return () => cancelAnimationFrame(frame);
  }, [lines, widgets, sizes]);

  const measureRef = (id: string): MeasureRef => {
    const known = measureRefsRef.current.get(id);

    if (known) {
      return known;
    }

    const callback: MeasureRef = (element) => {
      if (element) {
        elementsRef.current.set(id, element);
      } else {
        elementsRef.current.delete(id);
      }
    };

    measureRefsRef.current.set(id, callback);

    return callback;
  };

  return { sizes, measureRef };
};
