import { entries, groupBy, sum } from 'remeda';

import type { VehicleType } from '../../../../../generated';
import type { ReplayTrack } from '../replay-tracks/replay-tracks.types';
import type {
  AccumulateInput,
  HeatmapKeyInput,
  HeatmapScopesInput,
  MapBounds,
  MergeGridsInput,
  ToCellInput,
  VehicleClassesInput
} from './heatmap.types';

import { HEATMAP } from '../../config/heatmap.constants';
import { arenaBoundsSchema, heatmapDataSchema } from './heatmap.schemas';

export const fallbackBounds = (halfSize: number): MapBounds => ({ minX: -halfSize, maxX: halfSize, minZ: -halfSize, maxZ: halfSize });

export const arenaBounds = (data: unknown): MapBounds | null => {
  const parsed = arenaBoundsSchema.safeParse(data);

  if (!parsed.success) {
    return null;
  }

  const [minX, minZ] = parsed.data.boundingBox.bottomLeft;
  const [maxX, maxZ] = parsed.data.boundingBox.upperRight;

  return maxX > minX && maxZ > minZ ? { minX, maxX, minZ, maxZ } : null;
};

export const toCell = ({ x, z, bounds, gridSize }: ToCellInput): number | null => {
  if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) {
    return null;
  }

  const column = Math.min(gridSize - 1, Math.floor(((x - bounds.minX) / (bounds.maxX - bounds.minX)) * gridSize));
  const row = Math.min(gridSize - 1, Math.floor(((bounds.maxZ - z) / (bounds.maxZ - bounds.minZ)) * gridSize));

  return row * gridSize + column;
};

export const emptyGrid = (gridSize: number): number[] => Array.from<number>({ length: gridSize * gridSize }).fill(0);

export const accumulateTracks = ({ tracks, bounds, gridSize }: AccumulateInput): number[] => {
  const grid = emptyGrid(gridSize);

  for (const track of tracks) {
    for (const [, x, z] of track.points) {
      const cell = toCell({ x, z, bounds, gridSize });

      if (cell !== null) {
        grid[cell] = (grid[cell] ?? 0) + 1;
      }
    }
  }

  return grid;
};

export const mergeGrids = ({ base, add }: MergeGridsInput): number[] => {
  if (!base || base.length !== add.length) {
    return [...add];
  }

  return add.map((value, index) => value + (base[index] ?? 0));
};

export const readHeatmapCells = (data: unknown): number[] | null => {
  const parsed = heatmapDataSchema.safeParse(data);

  return parsed.success ? parsed.data.cells : null;
};

export const gridTotal = (cells: readonly number[]): number => sum(cells);

export const heatmapKey = ({ mode, scope }: HeatmapKeyInput): string => `${mode}:${scope}`;

export const trackVehicleTag = (vehicleType: string | null): string | null => vehicleType?.split(':')[1] || null;

export const vehicleClassesOf = ({ tracks, vehicles }: VehicleClassesInput): Map<number, VehicleType> => {
  const byTankId = new Map(vehicles.map((vehicle) => [vehicle.tankId, vehicle.type]));
  const byTag = new Map(vehicles.flatMap((vehicle) => (vehicle.tag ? [[vehicle.tag, vehicle.type] as const] : [])));

  return new Map(
    tracks.flatMap((track) => {
      const tag = trackVehicleTag(track.vehicleType);
      const type = (track.tankId === null ? undefined : byTankId.get(track.tankId)) ?? (tag === null ? undefined : byTag.get(tag));

      return type ? [[track.vehicleId, type] as const] : [];
    })
  );
};

export const heatmapScopes = ({ tracks, classes }: HeatmapScopesInput): Map<string, ReplayTrack[]> =>
  new Map<string, ReplayTrack[]>([[HEATMAP.allScope, [...tracks]], ...entries(groupBy(tracks, (track) => classes.get(track.vehicleId)))]);
