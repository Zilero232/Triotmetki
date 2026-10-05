import type { DragTarget, Rect } from '@/entities/hud/panel-layout';
import type { ClientSize } from '@/shared/api/gameface';

import type { MouseReport } from '../../../lib/mouse-report';

export type UseInputAreaInput = {
  edit: boolean;
  hover: boolean;
  dragging: boolean;
  screen: ClientSize;
  clickable: Rect[];
  targets: DragTarget[];
  hovered: string | null;
  report: MouseReport;
};
