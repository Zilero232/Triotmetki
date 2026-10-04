import type { RETICLE_MARKS } from '../../config';

export type ReticleShapeId = (typeof RETICLE_MARKS.shapeIds)[number];

export type ReticleMarkPart = (typeof RETICLE_MARKS.shapes)[ReticleShapeId][number];

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
