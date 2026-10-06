import { clampRect, panelRect } from '@/entities/hud/panel-layout';
import { rem } from '@/shared/lib/css-unit';

import type { AnchorStyle, PlaceInput, Rect, RectStyleInput } from './anchor.types';

const length = (value: number): string => rem(Math.round(value));

export const placeRect = ({ anchor, size, screen }: PlaceInput): Rect =>
  clampRect({ rect: panelRect({ panel: { ...anchor, width: size.width, height: size.height }, screen }), screen });

export const rectStyle = ({ rect }: RectStyleInput): AnchorStyle => ({ left: length(rect.left), top: length(rect.top) });
