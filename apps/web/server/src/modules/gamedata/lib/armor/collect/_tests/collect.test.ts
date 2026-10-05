import { describe, expect, it } from 'vitest';

import type { GameData } from '../../../game-data/game-data.types';

import { COLLISION_FIXTURES, loadIs, readFixture } from '../../../_tests/fixtures';
import { createLocalRepoReader } from '../../../source/local/local';
import { ForeignClientError } from '../../../source/mt-client/mt-client.errors';
import { MODEL_PATHS, MODEL_SOURCES } from '../../../source/source.constants';
import { collectArmorModels } from '../collect';
import { ArmorVersionMismatchError } from '../collect.errors';

const VERSION = '1.45.0.5231';
const spec = loadIs();

const FILES: Record<string, string> = {
  [MODEL_PATHS.version]: `${VERSION}\n`,
  [MODEL_PATHS.index]: readFixture(COLLISION_FIXTURES.index),
  [`${MODEL_PATHS.vehicles}/russian/R01_IS/${MODEL_PATHS.collision}`]: readFixture(COLLISION_FIXTURES.collision)
};

const reader = (files: Record<string, string>) => ({
  ...createLocalRepoReader({ source: MODEL_SOURCES.RU, root: '.', sha: 'b'.repeat(40) }),
  read: async (path: string) => files[path]
});

const gameData = (overrides: Partial<GameData> = {}): GameData => ({
  version: VERSION,
  revision: { sourceId: 'RU', owner: 'unicum-gg', repo: 'wot.src', ref: 'RU', sha: 'a'.repeat(40) },
  vehicles: [spec, { ...spec, tag: 'R99_Unknown', tankId: 99 }],
  shells: [],
  optionalDevices: [],
  equipment: [],
  crew: { roles: [], skills: [] },
  postProgression: { trees: [], modifications: [], pairs: [], features: [], prices: {} },
  arenas: [],
  warnings: [],
  ...overrides
});

describe('collectArmorModels', () => {
  it('packs every vehicle the mirror has and skips the rest', async () => {
    const collected = await collectArmorModels({ data: gameData(), reader: reader(FILES) });

    expect(collected.models.map(({ tag }) => tag)).toEqual([spec.tag]);
    expect(collected.skipped).toEqual([{ tag: 'R99_Unknown', reason: `not in ${MODEL_PATHS.index}` }]);
    expect(collected.version).toBe(VERSION);
    expect(collected.sourceSha).toBe('b'.repeat(40));
  });

  it('passes the join mismatches through for the dry-run report', async () => {
    const collected = await collectArmorModels({ data: gameData(), reader: reader(FILES) });

    expect(collected.mismatches.some((line) => line.includes('Hull.armor_1'))).toBe(true);
  });

  it('refuses a mirror built for another game version', async () => {
    const files = { ...FILES, [MODEL_PATHS.version]: '1.44.0.1' };

    await expect(collectArmorModels({ data: gameData(), reader: reader(files) })).rejects.toBeInstanceOf(ArmorVersionMismatchError);
  });

  it('refuses the Wargaming branch of the models mirror', async () => {
    const files = { ...FILES, [MODEL_PATHS.version]: '2.4.0.5450' };

    await expect(collectArmorModels({ data: gameData(), reader: reader(files) })).rejects.toBeInstanceOf(ForeignClientError);
  });

  it('names a vehicle the index lists but whose collision file is gone', async () => {
    const files = { ...FILES, [MODEL_PATHS.index]: JSON.stringify({ R01_IS: 'russian/R01_IS', R99_Unknown: 'russian/R99_Unknown' }) };
    const collected = await collectArmorModels({ data: gameData(), reader: reader(files) });

    expect(collected.skipped).toEqual([
      { tag: 'R99_Unknown', reason: `${MODEL_PATHS.vehicles}/russian/R99_Unknown/${MODEL_PATHS.collision} is missing` }
    ]);
  });

  it('refuses a test-server source outright', async () => {
    const data = gameData({ revision: { sourceId: 'PT_RU', owner: 'unicum-gg', repo: 'wot.src', ref: 'PT_RU', sha: 'a'.repeat(40) } });

    await expect(collectArmorModels({ data, reader: reader(FILES) })).rejects.toBeInstanceOf(ArmorVersionMismatchError);
  });

  it('skips a vehicle whose collision file is malformed and says why', async () => {
    const files = { ...FILES, [`${MODEL_PATHS.vehicles}/russian/R01_IS/${MODEL_PATHS.collision}`]: '{"parts": 1}' };
    const collected = await collectArmorModels({ data: gameData(), reader: reader(files) });

    expect(collected.models).toHaveLength(0);
    expect(collected.mismatches.some((line) => line.startsWith(spec.tag))).toBe(true);
  });
});
