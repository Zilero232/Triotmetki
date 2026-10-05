import type { Size } from '../..';

export type Measured = Size & { lines: number };

export type StickyInput = { previous: Measured | undefined; next: Measured };

export type WheelScaleInput = { current: number; deltaY: number };
