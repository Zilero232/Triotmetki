import { useLayoutEffect, useRef, useState } from 'react';

import { useMeasureFrames } from '@/shared/lib/use-measure-frames';

import type { PanelContent, Sizes } from '../../../lib/panel-sizes';
import type { MeasureRef, UsePanelSizesInput } from './use-panel-sizes.types';

import { HUD_OVERLAY } from '../../../config';
import { changedPanels, elementRef, emptyContent, readCountdown, settleSizes } from '../../../lib/panel-sizes';
import { remember } from '../../../lib/share-panels';

export const usePanelSizes = ({ panels, lines, widgets }: UsePanelSizesInput) => {
  const [sizes, setSizes] = useState<Sizes>({});
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const measureRefsRef = useRef(new Map<string, MeasureRef>());
  const framesLeftRef = useRef(new Map<string, number>());
  const contentRef = useRef<PanelContent>(emptyContent());

  const measure = (): void => {
    const readings = readCountdown({ framesLeft: framesLeftRef.current, elements: elementsRef.current, content: { lines, widgets } });

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

  const measureRef = (id: string): MeasureRef =>
    remember({ cache: measureRefsRef.current, key: id, build: () => elementRef({ elements: elementsRef.current, id }) });

  return { sizes, measureRef };
};
