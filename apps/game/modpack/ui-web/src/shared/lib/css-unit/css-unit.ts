import type { RemBox, RemBoxInput, RemRect, RemRectInput } from './css-unit.types';

import { CSS_UNIT } from './css-unit.constants';

export const rem = (value: number): string => `${String(value)}${CSS_UNIT.rem}`;

export const optionalRem = (value: number | undefined): string | undefined => (value === undefined ? undefined : rem(value));

export const remBox = ({ width, height }: RemBoxInput): RemBox => ({ width: rem(width), height: rem(height) });

export const remSquare = (size: number): RemBox => remBox({ width: size, height: size });

export const remRect = ({ left, top, width, height }: RemRectInput): RemRect => ({ left: rem(left), top: rem(top), ...remBox({ width, height }) });
