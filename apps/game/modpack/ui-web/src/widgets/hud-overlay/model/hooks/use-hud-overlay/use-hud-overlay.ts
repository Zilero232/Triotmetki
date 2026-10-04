import { useRef, useState } from 'react';

import type { DragTarget } from '../../../lib/hit-panel';
import type { LabelLayout } from '../../../lib/label-layout';
import type { HudLabelModel } from './use-hud-overlay.types';

import { sendHud } from '../../../../../shared/api/hud-protocol';
import { HUD_OVERLAY } from '../../../config';
import { layoutLabels } from '../../../lib/label-layout';
import { createMouseReport } from '../../../lib/mouse-report';
import { useHoveredPanel } from '../use-hovered-panel';
import { useHudScreen } from '../use-hud-screen';
import { useHudState } from '../use-hud-state';
import { useInputArea } from '../use-input-area';
import { usePanelContent } from '../use-panel-content';
import { usePanelDrag } from '../use-panel-drag';
import { usePanelHint } from '../use-panel-hint';
import { usePanelSizes } from '../use-panel-sizes';
import { useWheelResize } from '../use-wheel-resize';

export const useHudOverlay = () => {
  const { state, overrides, scales, onMoved, onScaled } = useHudState();
  const screen = useHudScreen();
  const isCovered = Boolean(state?.panels.some(({ cover }) => cover));
  const edit = Boolean(state?.edit) && !isCovered;
  const targetsRef = useRef<DragTarget[]>([]);
  const [report] = useState(createMouseReport);
  const pointerInput = { edit, report, targets: () => targetsRef.current, onMoved, onScaled };
  const { live } = usePanelDrag(pointerInput);

  useWheelResize(pointerInput);

  const { panels, lines, widgets } = usePanelContent(state);
  const { sizes, measureRef } = usePanelSizes({ lines, widgets });
  const layouts = layoutLabels({ panels, sizes, scales, overrides, screen, live, edit, widgets });

  const labelOf = ({ panel, id, style, button, movable, pointer }: LabelLayout): HudLabelModel => ({
    panel,
    lines: lines.get(id) ?? [],
    widget: widgets.get(id) ?? null,
    style,
    button,
    interactive: button || movable || pointer,
    framed: movable,
    dragging: live?.id === id,
    measureRef: measureRef(id),
    onClick: () => {
      if (button && !movable) {
        sendHud({ type: 'pressed', id });
      }
    }
  });

  targetsRef.current = layouts.map(({ id, rect, button, movable, pointer, scale }) => ({ id, rect, button, movable, pointer, scale }));

  const clickable = layouts.filter(({ button }) => button).map(({ rect }) => rect);
  const hovered = useHoveredPanel({ active: Boolean(state?.cursor) && !isCovered, targets: targetsRef.current });

  useInputArea({ edit, hover: Boolean(state?.hover), dragging: live !== null, screen, clickable, targets: targetsRef.current, hovered, report });

  const hint = usePanelHint(live === null ? layouts.find(({ id, panel }) => id === hovered && panel.visible) : undefined);

  return {
    labels: layouts.map(labelOf),
    hint,
    edit,
    screen,
    style: { width: `${screen.width}${HUD_OVERLAY.unit}`, height: `${screen.height}${HUD_OVERLAY.unit}` }
  };
};
