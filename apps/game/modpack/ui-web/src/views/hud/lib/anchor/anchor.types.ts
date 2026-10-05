import type { Rect, Size } from '@/entities/hud/panel-layout';
import type { HudPanel } from '@/shared/api/hud-protocol';

export type Anchor = Pick<HudPanel, 'align_x' | 'align_y' | 'x' | 'y'>;

export type AnchorStyle = Partial<Record<'left' | 'top', string>>;

export type PlaceInput = { anchor: Anchor; size: Size; screen: Size };

export type RectStyleInput = { rect: Rect };

export type { Rect, Size };
