import { clampRect, panelRect } from '@/entities/hud/panel-layout';

import type { AnchorStyle, PlaceInput, Rect, RectStyleInput } from './anchor.types';

import { HUD_OVERLAY } from '../../config';

const length = (value: number): string => `${Math.round(value)}${HUD_OVERLAY.unit}`;

export const placeRect = ({ anchor, size, screen }: PlaceInput): Rect =>
  clampRect({ rect: panelRect({ panel: { ...anchor, width: size.width, height: size.height }, screen }), screen });

export const rectStyle = ({ rect }: RectStyleInput): AnchorStyle => ({ left: length(rect.left), top: length(rect.top) });
