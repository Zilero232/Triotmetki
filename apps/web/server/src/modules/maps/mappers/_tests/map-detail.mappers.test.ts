import type { MapStats } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import type { ArenaRow } from '../map-detail.types';

import { MINIMAP } from '../../config/maps.constants';
import { minimapUrl, toMapDetail, toMapSummary } from '../map-detail.mappers';

const host = 'https://cdn.example.com/static/';
const image = `${host}${MINIMAP.directory}karelia.png`;
const minimapPath = `${MINIMAP.directory}minimaps/karelia_ctf.png`;

const arena: ArenaRow = {
  arenaId: '01_karelia',
  slug: 'karelia',
  name: 'Karelia',
  nameEn: 'Karelia',
  camouflageType: 'summer',
  description: null,
  descriptionEn: null,
  image,
  sizeMeters: 1_000,
  modes: ['ctf'],
  data: {
    boundingBox: { bottomLeft: [-500, -500], upperRight: [500, 500] },
    maxPlayersInTeam: 15,
    roundLength: 900,
    gameplay: [
      {
        type: 'ctf',
        minimapImage: minimapPath,
        teamBasePositions: { 1: [[0, 1]] },
        teamSpawnPoints: 'broken',
        controlPoints: []
      }
    ]
  }
};

const stats: MapStats = { source: 'battles', battles: 1, teams: [] };

describe('minimapUrl', () => {
  it('swaps the image path for the minimap path under the same host', () => {
    expect(minimapUrl({ image, path: minimapPath })).toBe(`${host}${minimapPath}`);
  });

  it('keeps the image when there is no minimap path', () => {
    expect(minimapUrl({ image, path: null })).toBe(image);
    expect(minimapUrl({ image, path: '' })).toBe(image);
  });

  it('keeps the image when it has no maps directory to replace', () => {
    const flat = `${host}karelia.png`;

    expect(minimapUrl({ image: flat, path: minimapPath })).toBe(flat);
  });

  it('returns null for a missing or invalid image', () => {
    expect(minimapUrl({ image: null, path: minimapPath })).toBeNull();
    expect(minimapUrl({ image: 'not a url', path: minimapPath })).toBeNull();
  });
});

describe('toMapSummary', () => {
  it('drops an image that is not a url', () => {
    expect(toMapSummary({ ...arena, image: 'karelia.png' }).image).toBeNull();
  });
});

describe('toMapDetail', () => {
  it('reads the arena geometry and game modes', () => {
    const detail = toMapDetail({ arena, stats });

    expect(detail).toMatchObject({ maxPlayersInTeam: 15, roundLengthSec: 900, stats });
    expect(detail.boundingBox).toEqual({ bottomLeft: [-500, -500], upperRight: [500, 500] });
    expect(detail.gameModes).toEqual([{ mode: 'ctf', minimap: `${host}${minimapPath}`, bases: { 1: [[0, 1]] }, spawns: {}, controlPoints: [] }]);
  });

  it('falls back to empty values when the arena has no data', () => {
    const detail = toMapDetail({ arena: { ...arena, data: null }, stats: null });

    expect(detail).toMatchObject({ boundingBox: null, maxPlayersInTeam: null, roundLengthSec: null, gameModes: [], stats: null });
  });

  it('falls back to empty values when the data is not an object', () => {
    expect(toMapDetail({ arena: { ...arena, data: 'broken' }, stats: null }).gameModes).toEqual([]);
  });
});
