import { describe, expect, it } from 'vitest';

import { memoryFiles } from '../../_tests/fixtures';
import { createMemoryReader } from '../../source/local/local';
import { MT_CLIENT } from '../../source/mt-client/mt-client.constants';
import { ForeignClientError } from '../../source/mt-client/mt-client.errors';
import { GAME_PATHS } from '../../source/source.constants';
import { buildGameData } from '../game-data';

describe('buildGameData', () => {
  it('reads every kind of game data through a reader', async () => {
    const data = await buildGameData({ reader: createMemoryReader({ sourceId: 'RU', files: memoryFiles() }), nations: ['ussr'] });

    expect(data.version).toBe('1.45.0.5231');
    expect(data.vehicles.map((vehicle) => vehicle.tag)).toEqual(['R01_IS']);
    expect(data.shells.length).toBeGreaterThan(0);
    expect(data.optionalDevices.length).toBeGreaterThan(0);
    expect(data.equipment.length).toBeGreaterThan(0);
    expect(data.crew.skills.length).toBeGreaterThan(0);
    expect(data.postProgression.trees.map((tree) => tree.name)).toEqual(['role_HT_break']);
    expect(data.arenas.map((arena) => arena.arenaId)).toEqual(['01_karelia']);
  });

  it('reports missing vehicle and arena files as warnings instead of failing', async () => {
    const data = await buildGameData({ reader: createMemoryReader({ sourceId: 'RU', files: memoryFiles() }), nations: ['ussr'] });

    expect(data.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('R54_KV-5'), expect.stringContaining('R106_KV85'), expect.stringContaining('02_malinovka')])
    );
  });

  it('fails loudly when a required common file is missing', async () => {
    const files = memoryFiles();

    delete files['sources/res/scripts/item_defs/vehicles/common/equipments.xml'];

    await expect(buildGameData({ reader: createMemoryReader({ sourceId: 'RU', files }), nations: ['ussr'] })).rejects.toThrow('equipments.xml');
  });

  it('refuses a World of Tanks (Wargaming) build instead of importing it as Мир танков', async () => {
    const files = { ...memoryFiles(), [GAME_PATHS.version]: '2.4.0.5450\n' };

    await expect(buildGameData({ reader: createMemoryReader({ sourceId: 'RU', files }), nations: ['ussr'] })).rejects.toBeInstanceOf(
      ForeignClientError
    );
  });

  it('refuses a mirror whose README names a Wargaming guid', async () => {
    const files = { ...memoryFiles(), [MT_CLIENT.readme]: '# WOT.EU.PRODUCTION\n' };

    await expect(buildGameData({ reader: createMemoryReader({ sourceId: 'RU', files }), nations: ['ussr'] })).rejects.toThrow('WOT.EU.PRODUCTION');
  });
});
