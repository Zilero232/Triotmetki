import { sendHud } from '@/shared/api/hud-protocol';

import type { HudMouseEvent } from './mouse-report.types';

export const createMouseReport = () => {
  const seen = new Set<HudMouseEvent>();

  return (event: HudMouseEvent): void => {
    if (!seen.has(event)) {
      seen.add(event);
      sendHud({ type: 'mouse', event });
    }
  };
};
