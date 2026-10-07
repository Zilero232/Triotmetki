import type { CSSProperties } from 'react';

import type { LiveRect, Rect, Size } from '@/entities/hud/panel-layout';
import type { UiPanel } from '@/shared/api/protocol';
import type { UiIconTone } from '@/shared/lib/icon-sprite';

export type PanelFit = 'bare' | 'icon' | 'label';

export type PanelFitInput = { rect: Rect; scale: number };

export type FitsInInput = { size: Size; limit: Size };

export type StackedRect = { id: string; rect: Rect };

export type PanelLayerInput = { base: number; selected: boolean; hovered: boolean };

export type PanelToneInput = { active: boolean; enabled: boolean };

export type PanelTone = Extract<UiIconTone, 'accent' | 'muted' | 'text'>;

export type StageFrameInput = { screen: Size; width: number };

export type StageFrame = { scale: number; style: { width: string; height: string } };

export type PlacedPanel = { panel: UiPanel; rect: Rect };

export type PlacedPanelsInput = { panels: UiPanel[]; showDisabled: boolean; live: LiveRect | null; screen: Size };

export type PanelLookInput = {
  placed: PlacedPanel;
  scale: number;
  screen: Size;
  order: Map<string, number>;
  selected: string | null;
  hovered: string | null;
};

export type PanelLook = { fit: PanelFit; selected: boolean; active: boolean; tone: PanelTone; style: CSSProperties };
