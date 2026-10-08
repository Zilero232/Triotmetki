import type { ReticleShapeId } from '../../../lib/reticle-mark';

export type ShownMark = { shape: ReticleShapeId; size: number; color: string | null; outline: boolean; isShown: boolean };
