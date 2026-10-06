import type { RETICLE_MARKS } from '../../config';

export type ReticleShapeId = (typeof RETICLE_MARKS.shapeIds)[number];

export type ReticleMarkPart = (typeof RETICLE_MARKS.shapes)[ReticleShapeId][number];

export type LinePart = Extract<ReticleMarkPart, { kind: 'line' }>;

export type ArcPart = Extract<ReticleMarkPart, { kind: 'arc' }>;

export type RingPart = Extract<ReticleMarkPart, { kind: 'ring' }>;

export type DiscPart = Extract<ReticleMarkPart, { kind: 'disc' }>;

export type StrokedPart = Exclude<ReticleMarkPart, { kind: 'disc' }>;

export type ReticlePaint = 'mark' | 'outline' | 'shade';

export type ReticlePrimitive = {
  d: string;
  paint: ReticlePaint;
  stroke: number | null;
};

export type ReticleMarkInput = {
  shape: ReticleShapeId;
  size: number;
  outline: boolean;
};

export type Frame = { centre: number; scale: number };

export type SnapInput = { value: number; width: number };

export type StrokeWidthInput = { weight: number; frame: Frame };

export type PathInput<Part> = { part: Part; frame: Frame; width: number };

export type PrimitivesInput<Part = ReticleMarkPart> = { part: Part; frame: Frame; outline: boolean };
