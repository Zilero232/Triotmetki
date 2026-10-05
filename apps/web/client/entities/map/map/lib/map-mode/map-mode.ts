import type { MapCamouflage, MapModeKind } from './map-mode.types';

import { MAP_CAMOUFLAGES, MAP_MODE_KINDS, MAP_MODE_PREFIXES } from '../../config';

const CAMOUFLAGES = new Set<string>(MAP_CAMOUFLAGES);

export const mapModeKind = (mode: string): MapModeKind | null =>
  MAP_MODE_KINDS.find((kind) => mode.toLowerCase().startsWith(MAP_MODE_PREFIXES[kind])) ?? null;

export const mapModeKinds = (modes: readonly string[]): MapModeKind[] => [
  ...new Set(modes.map(mapModeKind).filter((kind): kind is MapModeKind => kind !== null))
];

export const isMapCamouflage = (value: string | null): value is MapCamouflage => value !== null && CAMOUFLAGES.has(value);
