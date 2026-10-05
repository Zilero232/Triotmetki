import { useEffect, useEffectEvent, useState } from 'react';

import { panelUnder, pointerPoint, screenScale } from '@/entities/hud/panel-layout';
import { gameface } from '@/shared/api/gameface';

import type { UseHoveredPanelInput } from './use-hovered-panel.types';

import { HUD_OVERLAY } from '../../../config';

const hoveredId = ({ targets }: Pick<UseHoveredPanelInput, 'targets'>): string | null => {
  const position = gameface.mousePosition();

  if (!position) {
    return null;
  }

  const point = pointerPoint({ clientX: position.x, clientY: position.y, scale: screenScale() });

  return panelUnder({ targets, point })?.id ?? null;
};

export const useHoveredPanel = ({ active, targets }: UseHoveredPanelInput): string | null => {
  const [hovered, setHovered] = useState<string | null>(null);
  const poll = useEffectEvent(() => setHovered(hoveredId({ targets })));

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timer = setInterval(poll, HUD_OVERLAY.hoverPollMs);

    return () => {
      clearInterval(timer);
      setHovered(null);
    };
  }, [active]);

  return active ? hovered : null;
};
