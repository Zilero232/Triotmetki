import type { DragTarget, Placement } from '@/entities/hud/panel-layout';
import type { HudMessageOf } from '@/shared/api/hud-protocol';

import type { OverlayDrag, PanelPress } from '../../../lib/drag-motion';

export type MovedPanel = { id: string; placement: Placement };

export type SettleDragInput = { drag: OverlayDrag; press: PanelPress; onMoved: (moved: MovedPanel) => void };

export type ScaledPanel = { id: string; scale: number };

export type UsePanelDragInput = {
  edit: boolean;
  targets: () => DragTarget[];
  onMoved: (moved: MovedPanel) => void;
  onScaled: (scaled: ScaledPanel) => void;
  report: (event: HudMessageOf<'mouse'>['event']) => void;
};
