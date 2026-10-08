import { useWindowEvent } from '@siberiacancode/reactuse';
import { useRef, useState } from 'react';

import type { ScreenPoint } from '@/features/viewer/orbit-camera';

import { useOrbitCamera } from '@/features/viewer/orbit-camera';
import { useViewerFrame } from '@/features/viewer/viewer-frame';
import { gameface } from '@/shared/api/gameface';

import type { ScreenFraction } from '../../../lib/screen-point';

import { cardPlace, isSameFraction, screenFraction, screenLayer } from '../../../lib/screen-point';
import { useArmorViewer } from '../use-armor-viewer';

export const useArmorScreen = () => {
  const viewer = useArmorViewer();
  const layerRef = useRef<HTMLDivElement>(null);
  const sentRef = useRef<ScreenFraction | null>(null);
  const [cursor, setCursor] = useState<ScreenPoint | null>(null);
  const [layer, setLayer] = useState(() => screenLayer(gameface.viewRect()));

  const leave = (): void => {
    sentRef.current = null;
    setCursor(null);
    viewer.leave();
  };

  const hover = (point: ScreenPoint): void => {
    const rect = layerRef.current?.getBoundingClientRect();
    const fraction = rect ? screenFraction({ point, rect }) : null;

    if (fraction === null) {
      leave();

      return;
    }

    setCursor(point);

    if (!isSameFraction({ first: sentRef.current, second: fraction })) {
      sentRef.current = fraction;
      viewer.hoverAt(fraction);
    }
  };

  const surfaceRef = useOrbitCamera({ onMove: viewer.move, onHover: hover, onLeave: leave });
  const frame = useViewerFrame({ onDescribe: viewer.describe });

  useWindowEvent('resize', () => setLayer(screenLayer(gameface.viewRect())));

  const card = cursor && viewer.hover ? cardPlace({ point: cursor, viewport: { width: window.innerWidth, height: window.innerHeight } }) : null;

  return { viewer, surfaceRef, layerRef, layer, frame, card };
};
