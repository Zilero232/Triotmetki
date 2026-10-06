import { useLayoutEffect, useRef, useState } from 'react';

import type { Measured } from '@/entities/hud/panel-layout';

import { screenScale } from '@/entities/hud/panel-layout';
import { widgetLines } from '@/features/hud/widget-registry';
import { useMeasureFrames } from '@/shared/lib/use-measure-frames';

import type { PanelContent, Sizes } from '../../../lib/panel-sizes';
import type { MeasureRef, UsePanelSizesInput } from './use-panel-sizes.types';

import { HUD_OVERLAY } from '../../../config';
import { changedPanels, emptyContent, readSize, settleSizes } from '../../../lib/panel-sizes';

export const usePanelSizes = ({ panels, lines, widgets }: UsePanelSizesInput) => {
  const [sizes, setSizes] = useState<Sizes>({});
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const measureRefsRef = useRef(new Map<string, MeasureRef>());
  const framesLeftRef = useRef(new Map<string, number>());
  const contentRef = useRef<PanelContent>(emptyContent());

  const lineCount = (id: string): number => {
    const widget = widgets.get(id);

    return widget ? widgetLines(widget) : (lines.get(id)?.length ?? 0);
  };

  const readChanged = (): Map<string, Measured> => {
    const scale = screenScale();
    const readings = new Map<string, Measured>();

    framesLeftRef.current.forEach((left, id) => {
      const size = readSize({ element: elementsRef.current.get(id), lines: lineCount(id), scale });

      if (size) {
        readings.set(id, size);
      }

      if (left > 1) {
        framesLeftRef.current.set(id, left - 1);
      } else {
        framesLeftRef.current.delete(id);
      }
    });

    return readings;
  };

  const measure = (): void => {
    const readings = readChanged();

    if (readings.size > 0) {
      setSizes((current) => settleSizes({ current, readings }));
    }
  };

  useLayoutEffect(() => {
    const next = { lines, widgets };
    const changed = changedPanels({ previous: contentRef.current, next });

    changed.forEach((id) => framesLeftRef.current.set(id, HUD_OVERLAY.measureFrames + 1));
    contentRef.current = next;
  }, [lines, widgets]);

  useMeasureFrames({ measure, frames: HUD_OVERLAY.measureFrames, restartKey: panels });

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
