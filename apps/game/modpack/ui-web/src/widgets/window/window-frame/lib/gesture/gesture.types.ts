import type { Frame, Viewport } from '../frame';
import type { GestureKind } from '../hit';

export type Pointer = Pick<MouseEvent, 'clientX' | 'clientY'>;

export type Gesture = {
  kind: GestureKind;
  startX: number;
  startY: number;
  frame: Frame;
  last: Frame;
};

export type GestureStepInput = { gesture: Gesture; pointer: Pointer; viewport: Viewport };

export type GestureStep = { frame: Frame; dx: number; dy: number };
