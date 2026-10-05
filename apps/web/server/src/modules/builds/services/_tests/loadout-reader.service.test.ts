import type { ParsedLoadoutRequest } from '@otmetki/schemas';

import { loadoutRequestSchema } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Provision } from '../../../../../generated';

import { loadCatalog, loadIs } from '../../../gamedata/lib/_tests/fixtures';
import { BuildDataService } from '../build-data.service';
import { LoadoutReaderService } from '../loadout-reader.service';

const is = loadIs();
const catalog = loadCatalog();
const findRammer = () => {
  const found = catalog.optionalDevices.find((device) => device.name.toLowerCase().includes('rammer') && device.kind === 'standard');

  if (!found) {
    throw new Error('the gamedata fixture has no standard rammer');
  }

  return found;
};

const rammer = findRammer();

const deviceRow = (device: typeof rammer): Provision => ({
  provisionId: device.provisionId,
  name: device.displayName,
  nameKey: null,
  descriptionKey: null,
  tag: device.name,
  type: 'optionalDevice',
  description: null,
  image: null,
  priceCredit: null,
  priceGold: null,
  weight: null,
  tankIds: [is.tankId],
  data: JSON.parse(JSON.stringify(device)),
  updatedAt: new Date()
});

const request = (loadout: Partial<ParsedLoadoutRequest['loadout']>, extra: Partial<ParsedLoadoutRequest> = {}): ParsedLoadoutRequest =>
  loadoutRequestSchema.parse({ loadout: { equipment: [], consumables: [], crewSkills: {}, ...loadout }, ...extra });

const createService = (provisions: Provision[]) => {
  const data = mock<BuildDataService>();

  data.vehicle.mockResolvedValue(is);
  data.provisionsByIds.mockImplementation(async (ids) => provisions.filter((row) => ids.includes(row.provisionId)));
  data.provisions.mockResolvedValue(provisions);
  data.crewSkills.mockResolvedValue([]);

  return new LoadoutReaderService(data);
};

describe('LoadoutReaderService.calculate', () => {
  it('shortens the reload when a rammer is installed', async () => {
    const service = createService([deviceRow(rammer)]);
    const bare = await service.calculate({ tankId: is.tankId, request: request({}) });
    const rammed = await service.calculate({ tankId: is.tankId, request: request({ equipment: [rammer.provisionId] }) });

    expect(rammed.stats.reloadTime).toBeLessThan(bare.stats.reloadTime);
    expect(rammed.ignored).toEqual([]);
  });

  it('lists the items it could not install instead of failing', async () => {
    const service = createService([]);

    const result = await service.calculate({ tankId: is.tankId, request: request({ equipment: [999_999], fieldModifications: ['nope'] }) });

    expect(result.ignored).toEqual(['optionalDevice:999999', 'fieldModification:nope']);
  });

  it('refuses a module the vehicle does not have', async () => {
    const service = createService([]);

    await expect(service.calculate({ tankId: is.tankId, request: request({}, { modules: { gun: 'nope' } }) })).rejects.toMatchObject({
      response: { code: 'VALIDATION_FAILED' }
    });
  });

  it('computes the stock configuration when asked for it', async () => {
    const service = createService([]);

    const stock = await service.calculate({ tankId: is.tankId, request: request({ profileId: 'stock' }) });
    const top = await service.calculate({ tankId: is.tankId, request: request({ profileId: 'top' }) });

    expect(stock.profileId).toBe('stock');
    expect(stock.stats.modules).not.toEqual(top.stats.modules);
  });
});
