import type { Rect, Size } from '@/entities/hud/panel-layout';
import type { UiIconTone } from '@/shared/lib/icon-sprite';

export type PanelFit = 'bare' | 'icon' | 'label';

export type PanelFitInput = { rect: Rect; scale: number };

export type FitsInInput = { size: Size; limit: Size };

export type StackedRect = { id: string; rect: Rect };

export type PanelLayerInput = { base: number; selected: boolean; hovered: boolean };

export type PanelToneInput = { active: boolean; enabled: boolean };

export type PanelTone = Extract<UiIconTone, 'accent' | 'muted' | 'text'>;

export type StageFrameInput = { screen: Size; width: number };

export type StageWidthInput = { room: Size; screen: Size };

export type StageFrame = { scale: number; style: { width: string; height: string } };
