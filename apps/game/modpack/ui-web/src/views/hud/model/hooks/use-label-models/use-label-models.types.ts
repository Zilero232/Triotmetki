import type { ResolvedWidget } from '@/features/hud/widget-registry';
import type { HudPanel } from '@/shared/api/hud-protocol';
import type { RichLine } from '@/shared/lib/rich-text';

import type { LabelLayout, LabelStyle } from '../../../lib/label-layout';
import type { MeasureRef } from '../use-panel-sizes';

export type HudLabelModel = {
  id: string;
  panel: HudPanel;
  lines: RichLine[] | null;
  widget: ResolvedWidget | null;
  style: LabelStyle;
  interactive: boolean;
  framed: boolean;
  dragging: boolean;
  measureRef: MeasureRef;
};

export type UseLabelModelsInput = {
  layouts: LabelLayout[];
  lines: Map<string, RichLine[]>;
  widgets: Map<string, ResolvedWidget | null>;
  liveId: string | null;
  measureRef: (id: string) => MeasureRef;
};
