import { clampRect, panelRect } from '@/entities/hud/panel-layout';
import { rem } from '@/shared/lib/css-unit';
import { snapToDevice } from '@/shared/lib/pixel-snap';

import type { AnchorStyle, PlaceInput, Rect, RectStyleInput } from './anchor.types';

export const placeRect = ({ anchor, size, screen }: PlaceInput): Rect =>
  clampRect({ rect: panelRect({ panel: { ...anchor, width: size.width, height: size.height }, screen }), screen });

export const rectStyle = ({ rect, ratio }: RectStyleInput): AnchorStyle => ({
  left: rem(snapToDevice({ value: rect.left, ratio })),
  top: rem(snapToDevice({ value: rect.top, ratio }))
});
