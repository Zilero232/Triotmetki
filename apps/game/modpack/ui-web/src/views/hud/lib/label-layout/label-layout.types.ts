import type { DragTarget, LiveRect, Measured, Placement, Rect } from '@/entities/hud/panel-layout';
import type { ResolvedWidget } from '@/features/hud/widget-registry';
import type { ClientSize } from '@/shared/api/gameface';
import type { HudPanel } from '@/shared/api/hud-protocol';

import type { AnchorStyle } from '../anchor';
import type { DockItem } from '../dock';

export type Overrides = Partial<Record<string, Placement>>;

export type Scales = Partial<Record<string, number>>;

export type Sizes = Partial<Record<string, Measured>>;

export type LabelStyle = AnchorStyle & { opacity: number; transform?: string; transformOrigin?: string };

export type LabelLayout = DragTarget & { panel: HudPanel; style: LabelStyle; drawn: boolean };

export type LayoutLabelsInput = {
  panels: HudPanel[];
  sizes: Sizes;
  scales: Scales;
  overrides: Overrides;
  screen: ClientSize;
  ratio: number;
  live: LiveRect | null;
  edit: boolean;
  widgets: Map<string, ResolvedWidget | null>;
};

export type ScaleOfInput = { panel: HudPanel; scales: Scales };

export type DockItemInput = Pick<LayoutLabelsInput, 'overrides' | 'screen' | 'sizes'> & { panel: HudPanel; scale: number };

export type OpacityOfInput = { panel: HudPanel; settled: boolean };

export type LabelStyleInput = { rect: Rect; scale: number; ratio: number; opacity: number };

export type ObstaclesInput = Pick<LayoutLabelsInput, 'overrides' | 'panels' | 'screen'> & { items: DockItem[] };
