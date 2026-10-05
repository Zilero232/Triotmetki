import type { Vehicle, VehicleType } from '../../../../../generated';
import type { ReplayTrack } from '../replay-tracks/replay-tracks.types';

export type MapBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type ToCellInput = {
  x: number;
  z: number;
  bounds: MapBounds;
  gridSize: number;
};

export type AccumulateInput = {
  tracks: readonly ReplayTrack[];
  bounds: MapBounds;
  gridSize: number;
};

export type MergeGridsInput = {
  base: readonly number[] | null;
  add: readonly number[];
};

export type HeatmapKeyInput = {
  mode: string;
  scope: string;
};

export type VehicleClassesInput = {
  tracks: readonly ReplayTrack[];
  vehicles: readonly Pick<Vehicle, 'tag' | 'tankId' | 'type'>[];
};

export type HeatmapScopesInput = {
  tracks: readonly ReplayTrack[];
  classes: ReadonlyMap<number, VehicleType>;
};
