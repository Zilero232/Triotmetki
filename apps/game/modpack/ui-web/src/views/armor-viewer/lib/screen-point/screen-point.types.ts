import type { ScreenPoint } from '@/features/viewer/orbit-camera';

export type ScreenRect = { left: number; top: number; width: number; height: number };

export type ScreenFractionInput = { point: ScreenPoint; rect: ScreenRect };

export type ScreenFraction = { x: number; y: number };

export type ScreenLayer = { left: string; top: string };

export type CardPlaceInput = { point: ScreenPoint; viewport: { width: number; height: number } };

export type CardPlace = { left: string; top: string; transform: string };

export type SameFractionInput = { first: ScreenFraction | null; second: ScreenFraction };
