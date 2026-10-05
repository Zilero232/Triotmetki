import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { VehicleCatalogService } from '../../../reference';

import { VEHICLE_STATUS } from '../../../reference';
import { VehiclesReaderService } from '../vehicles-reader.service';
import { catalogEntry, vehicle } from './tanks.fixtures';

const createService = () => {
  const catalog = mock<VehicleCatalogService>();

  return { service: new VehiclesReaderService(catalog), catalog };
};

describe('VehiclesReaderService', () => {
  it('orders vehicles by nation, then tier, then name', async () => {
    const { service, catalog } = createService();

    catalog.filter.mockResolvedValue([
      catalogEntry(vehicle({ tankId: 1, nation: 'usa', tier: 1, name: 'A' })),
      catalogEntry(vehicle({ tankId: 2, nation: 'germany', tier: 10, name: 'B' })),
      catalogEntry(vehicle({ tankId: 3, nation: 'germany', tier: 5, name: 'Z' })),
      catalogEntry(vehicle({ tankId: 4, nation: 'germany', tier: 5, name: 'C' }))
    ]);

    const list = await service.list({});

    expect(list.map((vehicle) => vehicle.tankId)).toEqual([4, 3, 2, 1]);
  });

  it('adds each vehicle role and null for a vehicle without one', async () => {
    const { service, catalog } = createService();

    catalog.filter.mockResolvedValue([
      catalogEntry(vehicle({ tankId: 1, name: 'A' }), { tags: [], role: 'role_MT_sniper', notInShop: false }),
      catalogEntry(vehicle({ tankId: 2, name: 'B' }))
    ]);

    const list = await service.list({});

    expect(list.map((vehicle) => vehicle.role)).toEqual(['MT_sniper', null]);
  });

  it('flags preferential matchmaking from the stored client tags', async () => {
    const { service, catalog } = createService();

    catalog.filter.mockResolvedValue([
      catalogEntry(vehicle({ tankId: 1, name: 'A' }), { tags: ['heavyTank', VEHICLE_STATUS.preferentialTag], role: null, notInShop: true }),
      catalogEntry(vehicle({ tankId: 2, name: 'B' }))
    ]);

    const list = await service.list({});

    expect(list.map((vehicle) => vehicle.isPreferential)).toEqual([true, false]);
  });

  it('passes the filter, statuses and roles included, to the catalog', async () => {
    const { service, catalog } = createService();
    const filter = { nations: ['ussr'], statuses: ['reward' as const], roles: ['HT_break' as const] };

    catalog.filter.mockResolvedValue([]);

    await expect(service.list(filter)).resolves.toEqual([]);
    expect(catalog.filter).toHaveBeenCalledWith(filter);
  });
});
