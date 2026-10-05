import { clamp } from 'remeda';

import type { UiMessageOf } from '@/shared/api/protocol';

import { PROTOCOL } from '@/shared/api/protocol';

import type {
  AnchorInput,
  DragInput,
  DragToInput,
  LiveRect,
  MoveMessageInput,
  PanelRectInput,
  PastSlopInput,
  PercentInput,
  Placement,
  Rect,
  RectOnScreen,
  ScaleInput,
  StageBox,
  ThirdInput
} from './panel-geometry.types';

const anchorOffset = ({ align, size, extent }: AnchorInput): number => {
  if (align === 'left' || align === 'top') {
    return 0;
  }

  if (align === 'center') {
    return (extent - size) / 2;
  }

  return extent - size;
};

const third = ({ center, extent }: ThirdInput): 0 | 1 | 2 => {
  if (center < extent / 3) {
    return 0;
  }

  return center > (extent * 2) / 3 ? 2 : 1;
};

const percentOf = ({ value, extent }: PercentInput): string => `${(value / Math.max(extent, 1)) * 100}%`;

export const panelRect = ({ panel, screen }: PanelRectInput): Rect => ({
  left: anchorOffset({ align: panel.align_x, size: panel.width, extent: screen.width }) + panel.x,
  top: anchorOffset({ align: panel.align_y, size: panel.height, extent: screen.height }) + panel.y,
  width: panel.width,
  height: panel.height
});

export const clampRect = ({ rect, screen }: RectOnScreen): Rect => ({
  ...rect,
  left: clamp(rect.left, { min: 0, max: Math.max(screen.width - rect.width, 0) }),
  top: clamp(rect.top, { min: 0, max: Math.max(screen.height - rect.height, 0) })
});

export const dragRect = ({ rect, dx, dy, screen, grid }: DragInput): Rect => {
  const snap = (value: number): number => (grid > 1 ? Math.round(value / grid) * grid : Math.round(value));

  return clampRect({ rect: { ...rect, left: snap(rect.left + dx), top: snap(rect.top + dy) }, screen });
};

export const placementOf = ({ rect, screen }: RectOnScreen): Placement => {
  const alignX = PROTOCOL.alignX[third({ center: rect.left + rect.width / 2, extent: screen.width })];
  const alignY = PROTOCOL.alignY[third({ center: rect.top + rect.height / 2, extent: screen.height })];

  return {
    x: Math.round(rect.left - anchorOffset({ align: alignX, size: rect.width, extent: screen.width })),
    y: Math.round(rect.top - anchorOffset({ align: alignY, size: rect.height, extent: screen.height })),
    align_x: alignX,
    align_y: alignY
  };
};

export const pastSlop = ({ from, to, slop }: PastSlopInput): boolean => Math.hypot(to.x - from.x, to.y - from.y) > slop;

export const stageScale = ({ screen, stage }: ScaleInput): number =>
  Math.min(stage.width / Math.max(screen.width, 1), stage.height / Math.max(screen.height, 1));

export const stageBox = ({ rect, screen }: RectOnScreen): StageBox => ({
  left: percentOf({ value: rect.left, extent: screen.width }),
  top: percentOf({ value: rect.top, extent: screen.height }),
  width: percentOf({ value: rect.width, extent: screen.width }),
  height: percentOf({ value: rect.height, extent: screen.height })
});

export const dragTo = ({ drag, pointer, screen, grid }: DragToInput): LiveRect | null => {
  if (drag.scale <= 0) {
    return null;
  }

  const dx = (pointer.x - drag.mouseX) / drag.scale;
  const dy = (pointer.y - drag.mouseY) / drag.scale;

  return { id: drag.id, rect: dragRect({ rect: drag.rect, dx, dy, screen, grid }) };
};

export const moveMessage = ({ id, rect, screen }: MoveMessageInput): UiMessageOf<'hud_move'> => ({
  type: 'hud_move',
  panel: id,
  ...placementOf({ rect, screen })
});
