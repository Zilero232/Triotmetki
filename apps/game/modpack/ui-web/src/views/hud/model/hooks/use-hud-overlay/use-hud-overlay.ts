import { useMemo, useRef, useState } from 'react';

import type { DragTarget } from '@/entities/hud/panel-layout';

import { screenScale } from '@/entities/hud/panel-layout';
import { usePanelDrag, useWheelResize } from '@/features/hud/edit-panels';
import { remBox } from '@/shared/lib/css-unit';

import { layoutLabels } from '../../../lib/label-layout';
import { createMouseReport } from '../../../lib/mouse-report';
import { useDrawnReport } from '../use-drawn-report';
import { useHoveredPanel } from '../use-hovered-panel';
import { useHudScreen } from '../use-hud-screen';
import { useHudState } from '../use-hud-state';
import { useInputArea } from '../use-input-area';
import { useLabelModels } from '../use-label-models';
import { usePanelContent } from '../use-panel-content';
import { usePanelSizes } from '../use-panel-sizes';

export const useHudOverlay = () => {
  const { state, overrides, scales, onMoved, onScaled } = useHudState();
  const screen = useHudScreen();
  const ratio = screenScale();
  const edit = Boolean(state?.edit);
  const targetsRef = useRef<DragTarget[]>([]);
  const [report] = useState(createMouseReport);
  const pointerInput = { edit, report, targets: () => targetsRef.current, onMoved, onScaled };
  const { live } = usePanelDrag(pointerInput);

  useWheelResize(pointerInput);

  const { panels, lines, widgets } = usePanelContent(state);
  const { sizes, measureRef } = usePanelSizes({ panels, lines, widgets });
  const layouts = useMemo(
    () => layoutLabels({ panels, sizes, scales, overrides, screen, ratio, live, edit, widgets }),
    [panels, sizes, scales, overrides, screen, ratio, live, edit, widgets]
  );

  const labels = useLabelModels({ layouts, lines, widgets, liveId: live?.id ?? null, measureRef });

  useDrawnReport(layouts);

  targetsRef.current = layouts.map(({ id, rect, movable, pointer, scale }) => ({ id, rect, movable, pointer, scale }));

  const hovered = useHoveredPanel({ active: Boolean(state?.cursor), targets: targetsRef.current });

  useInputArea({ edit, hover: Boolean(state?.hover), dragging: live !== null, screen, targets: targetsRef.current, hovered, report });

  return {
    labels,
    style: remBox(screen)
  };
};
