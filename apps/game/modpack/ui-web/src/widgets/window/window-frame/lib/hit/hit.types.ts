import type { ResizeEdge } from '../frame';

export type GestureKind = 'move' | ResizeEdge;

export type Box = Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>;

export type HitTarget = {
  kind: GestureKind;
  rect: Box | null;
};

export type InsideInput = {
  rect: Box | null;
  x: number;
  y: number;
};

export type GestureAtInput = {
  targets: HitTarget[];
  x: number;
  y: number;
};
