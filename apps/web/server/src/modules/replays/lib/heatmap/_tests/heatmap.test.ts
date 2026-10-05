import { describe, expect, it } from 'vitest';

import type { ReplayTrack } from '../../replay-tracks/replay-tracks.types';

import { HEATMAP } from '../../../config/heatmap.constants';
import {
  accumulateTracks,
  arenaBounds,
  emptyGrid,
  fallbackBounds,
  gridTotal,
  heatmapScopes,
  mergeGrids,
  readHeatmapCells,
  toCell,
  trackVehicleTag,
  vehicleClassesOf
} from '../heatmap';

const bounds = fallbackBounds(100);
const gridSize = 4;

const track = (points: ReplayTrack['points']): ReplayTrack => ({
  vehicleId: 1,
  accountId: null,
  name: 'x',
  team: 1,
  tankId: null,
  vehicleType: null,
  points
});

describe('toCell', () => {
  it('puts the north-west corner in the first cell and the south-east in the last', () => {
    expect(toCell({ x: -100, z: 100, bounds, gridSize })).toBe(0);
    expect(toCell({ x: 100, z: -100, bounds, gridSize })).toBe(gridSize * gridSize - 1);
  });

  it('drops points outside the map', () => {
    expect(toCell({ x: 101, z: 0, bounds, gridSize })).toBeNull();
    expect(toCell({ x: 0, z: -100.5, bounds, gridSize })).toBeNull();
  });
});

describe('accumulateTracks', () => {
  it('counts every in-bounds sample exactly once', () => {
    const grid = accumulateTracks({
      tracks: [
        track([
          [0, 0, 0],
          [1, 0, 0],
          [2, 500, 500]
        ])
      ],
      bounds,
      gridSize
    });

    expect(grid).toHaveLength(gridSize * gridSize);
    expect(gridTotal(grid)).toBe(2);
  });
});

describe('mergeGrids', () => {
  it('adds cell by cell', () => {
    expect(mergeGrids({ base: [1, 2], add: [3, 4] })).toEqual([4, 6]);
  });

  it('starts over when the stored grid has another size', () => {
    expect(mergeGrids({ base: emptyGrid(2), add: [1, 1] })).toEqual([1, 1]);
    expect(mergeGrids({ base: null, add: [5] })).toEqual([5]);
  });
});

describe('arenaBounds', () => {
  it('reads the bounding box from arena data', () => {
    expect(arenaBounds({ boundingBox: { bottomLeft: [-500, -400], upperRight: [500, 400] } })).toEqual({
      minX: -500,
      maxX: 500,
      minZ: -400,
      maxZ: 400
    });
  });

  it('rejects missing or degenerate boxes', () => {
    expect(arenaBounds(null)).toBeNull();
    expect(arenaBounds({ boundingBox: { bottomLeft: [10, 10], upperRight: [10, 20] } })).toBeNull();
  });
});

describe('readHeatmapCells', () => {
  it('returns null for a malformed stored value', () => {
    expect(readHeatmapCells({ cells: [1, -1] })).toBeNull();
    expect(readHeatmapCells({ cells: [0, 2] })).toEqual([0, 2]);
  });
});

describe('trackVehicleTag', () => {
  it('takes the tag after the nation prefix', () => {
    expect(trackVehicleTag('germany:G16_PzVIB_Tiger_II')).toBe('G16_PzVIB_Tiger_II');
  });

  it('returns null without a tag', () => {
    expect(trackVehicleTag(null)).toBeNull();
    expect(trackVehicleTag('germany')).toBeNull();
  });
});

describe('vehicleClassesOf', () => {
  it('resolves a track by tank id first and by vehicle tag otherwise', () => {
    const byId = { ...track([]), vehicleId: 1, tankId: 10 };
    const byTag = { ...track([]), vehicleId: 2, vehicleType: 'ussr:R04_T-34' };
    const unknown = { ...track([]), vehicleId: 3, vehicleType: 'ussr:Nope' };
    const vehicles = [
      { tankId: 10, tag: 'X', type: 'heavyTank' as const },
      { tankId: 20, tag: 'R04_T-34', type: 'mediumTank' as const }
    ];

    expect(vehicleClassesOf({ tracks: [byId, byTag, unknown], vehicles })).toEqual(
      new Map([
        [1, 'heavyTank'],
        [2, 'mediumTank']
      ])
    );
  });
});

describe('heatmapScopes', () => {
  it('puts every track in the all scope and each classified track in its class scope', () => {
    const heavy = { ...track([]), vehicleId: 1 };
    const unclassified = { ...track([]), vehicleId: 2 };
    const scopes = heatmapScopes({ tracks: [heavy, unclassified], classes: new Map([[1, 'heavyTank' as const]]) });

    expect(scopes.get(HEATMAP.allScope)).toEqual([heavy, unclassified]);
    expect(scopes.get('heavyTank')).toEqual([heavy]);
    expect(scopes.size).toBe(2);
  });
});
