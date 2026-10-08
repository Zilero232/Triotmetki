import { round } from 'remeda';

import type { ViewRect } from '@/shared/api/gameface';

import { rem } from '@/shared/lib/css-unit';

import type { CardPlace, CardPlaceInput, SameFractionInput, ScreenFraction, ScreenFractionInput, ScreenLayer } from './screen-point.types';

import { ARMOR_VIEWER } from '../../config';

const isInside = (value: number): boolean => value >= 0 && value <= 1;

export const screenFraction = ({ point, rect }: ScreenFractionInput): ScreenFraction | null => {
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const x = (point.x - rect.left) / rect.width;
  const y = (point.y - rect.top) / rect.height;

  if (!isInside(x) || !isInside(y)) {
    return null;
  }

  return { x: round(x, ARMOR_VIEWER.hover.digits), y: round(y, ARMOR_VIEWER.hover.digits) };
};

export const screenLayer = (view: ViewRect | null): ScreenLayer => ({
  left: rem(view ? -view.x : 0),
  top: rem(view ? -view.y : 0)
});

export const cardPlace = ({ point, viewport }: CardPlaceInput): CardPlace => {
  const { offset, flipShare } = ARMOR_VIEWER.hover;
  const isRight = point.x > viewport.width * flipShare;
  const isLow = point.y > viewport.height * flipShare;
  const shiftX = isRight ? '-100%' : '0';
  const shiftY = isLow ? '-100%' : '0';

  return {
    left: `${String(point.x + (isRight ? -offset : offset))}px`,
    top: `${String(point.y + (isLow ? -offset : offset))}px`,
    transform: `translate(${shiftX}, ${shiftY})`
  };
};

export const isSameFraction = ({ first, second }: SameFractionInput): boolean => first !== null && first.x === second.x && first.y === second.y;
