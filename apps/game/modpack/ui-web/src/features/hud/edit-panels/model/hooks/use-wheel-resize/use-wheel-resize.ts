import { useWindowEvent } from '@siberiacancode/reactuse';

import { screenScale, targetAt, wheelScale } from '@/entities/hud/panel-layout';
import { sendHud } from '@/shared/api/hud-protocol';
import { wheelDelta } from '@/shared/lib/wheel-scroll';

import type { UseWheelResizeInput } from './use-wheel-resize.types';

export const useWheelResize = ({ edit, targets, onScaled, report }: UseWheelResizeInput): void => {
  const resize = (event: WheelEvent): void => {
    const found = edit ? targetAt({ targets: targets(), press: event, scale: screenScale() }) : null;

    if (!found) {
      return;
    }

    event.preventDefault();
    report('wheel');

    const next = wheelScale({ current: found.scale, deltaY: wheelDelta(event) });

    if (next !== found.scale) {
      onScaled({ id: found.id, scale: next });
      sendHud({ type: 'resized', id: found.id, scale: next });
    }
  };

  useWindowEvent('wheel', resize, { passive: false });
};
