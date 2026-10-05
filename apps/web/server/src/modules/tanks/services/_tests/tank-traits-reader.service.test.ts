import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { VehicleCatalogService } from '../../../reference';
import type { TankDifficultyReaderService } from '../tank-difficulty-reader.service';

import { TankTraitsReaderService } from '../tank-traits-reader.service';
import { catalogEntry, catalogOf, vehicle } from './tanks.fixtures';

const researchable = catalogEntry(vehicle({ tankId: 1 }), { tags: [], role: 'role_HT_break', notInShop: false });
const collector = catalogEntry(vehicle({ tankId: 2, isPremium: true, isCollectible: true }));
const shopPremium = { ...catalogEntry(vehicle({ tankId: 3, isPremium: true, tier: 8 }), { tags: [], role: null, notInShop: true }), hasOffers: true };
const reward = catalogEntry(vehicle({ tankId: 4, isPremium: true, tier: 10, status: 'reward' }), {
  tags: [],
  role: 'role_HT_assault',
  notInShop: true
});

const entries = [researchable, collector, shopPremium, reward];

const createService = () => {
  const catalog = mock<VehicleCatalogService>();
  const difficulty = mock<TankDifficultyReaderService>();

  catalog.all.mockResolvedValue(catalogOf(...entries));

  return { service: new TankTraitsReaderService(catalog, difficulty), catalog, difficulty };
};

describe('TankTraitsReaderService.of', () => {
  it('reads the status and role the catalog classified', async () => {
    const { service } = createService();

    expect((await service.of(1))?.traits).toEqual({ status: 'researchable', role: 'HT_break' });
    expect((await service.of(2))?.traits.status).toBe('collector');
    expect((await service.of(4))?.traits).toEqual({ status: 'reward', role: 'HT_assault' });
  });

  it('keeps the shop-offer flag and the spec the sources are derived from', async () => {
    const { service } = createService();

    const found = await service.of(3);

    expect(found?.hasOffers).toBe(true);
    expect(found?.spec.notInShop).toBe(true);
  });

  it('returns null for a tank outside the catalog', async () => {
    const { service } = createService();

    await expect(service.of(999)).resolves.toBeNull();
  });
});

describe('TankTraitsReaderService.traits', () => {
  it('defaults an unknown tank to researchable without a role', async () => {
    const { service } = createService();

    await expect(service.traits(999)).resolves.toEqual({ status: 'researchable', role: null });
  });
});

describe('TankTraitsReaderService.filter', () => {
  it('passes every entry through when no trait filter is set', async () => {
    const { service } = createService();

    const filtered = await service.filter({ entries, filter: {} });

    expect(filtered).toEqual(entries);
    expect(filtered).not.toBe(entries);
  });

  it('keeps only tanks of the requested statuses', async () => {
    const { service } = createService();

    const filtered = await service.filter({ entries, filter: { statuses: ['collector', 'reward'] } });

    expect(filtered.map((entry) => entry.summary.tankId)).toEqual([2, 4]);
  });

  it('keeps only tanks of the requested roles', async () => {
    const { service } = createService();

    const filtered = await service.filter({ entries, filter: { roles: ['HT_assault'] } });

    expect(filtered.map((entry) => entry.summary.tankId)).toEqual([4]);
  });

  it('narrows by difficulty before applying the trait filter', async () => {
    const { service, difficulty } = createService();

    difficulty.matching.mockResolvedValue(new Set([1, 4]));

    const byDifficulty = await service.filter({ entries, filter: { difficulties: ['hard'] } });
    const both = await service.filter({ entries, filter: { difficulties: ['hard'], statuses: ['reward'] } });

    expect(byDifficulty.map((entry) => entry.summary.tankId)).toEqual([1, 4]);
    expect(both.map((entry) => entry.summary.tankId)).toEqual([4]);
  });

  it('ignores an empty difficulty list', async () => {
    const { service, difficulty } = createService();

    await service.filter({ entries, filter: { difficulties: [] } });

    expect(difficulty.matching).not.toHaveBeenCalled();
  });
});
