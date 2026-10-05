import type { ResolvedWidget } from '@/features/hud/widget-registry';
import type { HudPanel } from '@/shared/api/hud-protocol';
import type { RichLine } from '@/shared/lib/rich-text';

import type { LabelStyle } from '../../../lib/label-layout';
import type { MeasureRef } from '../use-panel-sizes';

export type HudLabelModel = {
  panel: HudPanel;
  lines: RichLine[];
  widget: ResolvedWidget | null;
  style: LabelStyle;
  button: boolean;
  interactive: boolean;
  framed: boolean;
  dragging: boolean;
  measureRef: MeasureRef;
  onClick: () => void;
};
