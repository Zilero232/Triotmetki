import { useEffect, useRef, useState } from 'react';

import type { UiWindow } from '@/shared/api/protocol';

import { send } from '@/shared/api/protocol';
import { reportOnce } from '@/shared/lib/page-diag';

import type { Frame } from '../../../lib/frame';
import type { PersistInput } from './use-window-frame.types';

import { WINDOW_FRAME } from '../../../config';
import { describeFrame, describeViewport } from '../../../lib/describe';
import { boundsOf, centredFrame, layoutOf, openingFrame, toRem, zoomStep } from '../../../lib/frame';
import { useFrameGesture } from '../use-frame-gesture';
import { useViewport } from '../use-viewport';

const persist = (next: PersistInput): void => {
  send({ type: 'window_layout', ...next.frame, zoom: next.zoom, placed: next.placed ?? true });
};

export const useWindowFrame = (saved: UiWindow | null) => {
  const viewport = useViewport();
  const [placed, setPlaced] = useState<Frame | null>(null);
  const [chosenZoom, setChosenZoom] = useState<number | null>(null);
  const bounds = boundsOf(viewport);
  const zoom = chosenZoom ?? saved?.zoom ?? WINDOW_FRAME.defaultZoom;
  const frame = openingFrame({ placed, saved, bounds });
  const latestRef = useRef({ frame, zoom, viewport });
  const opened = saved !== null;

  latestRef.current = { frame, zoom, viewport };

  const handles = useFrameGesture({ frame, viewport, onChange: setPlaced, onDone: (last) => persist({ frame: last, zoom: latestRef.current.zoom }) });

  useEffect(() => {
    if (opened) {
      const current = latestRef.current;

      reportOnce({ kind: 'window opened', text: `${describeViewport(current.viewport)}; frame ${describeFrame(current.frame)}` });
    }
  }, [opened]);

  const changeZoom = (direction: -1 | 1): void => {
    const next = zoomStep({ zoom, direction });

    if (next !== zoom) {
      setChosenZoom(next);
      persist({ frame, zoom: next });
    }
  };

  const layout = layoutOf({ frame, zoom });

  return {
    zoom,
    layout,
    handles,
    frameStyle: { left: toRem(frame.x), top: toRem(frame.y), width: toRem(frame.width), height: toRem(frame.height) },
    innerStyle: {
      width: toRem(layout.inner.width),
      height: toRem(layout.inner.height),
      ...(layout.scale === 1 ? {} : { transform: `scale(${layout.scale})`, transformOrigin: '0 0' })
    },
    canZoomIn: zoom < Math.max(...WINDOW_FRAME.zoomSteps),
    canZoomOut: zoom > Math.min(...WINDOW_FRAME.zoomSteps),
    zoomIn: () => changeZoom(1),
    zoomOut: () => changeZoom(-1),
    onRecentre: () => {
      const centred = centredFrame({ bounds, size: { width: frame.width, height: frame.height } });

      setPlaced(centred);
      persist({ frame: centred, zoom, placed: false });
    },
    onReset: () => {
      const centred = centredFrame({ bounds });

      setPlaced(centred);
      setChosenZoom(WINDOW_FRAME.defaultZoom);
      persist({ frame: centred, zoom: WINDOW_FRAME.defaultZoom, placed: false });
    }
  };
};
