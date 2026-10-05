import { describe, expect, it } from 'vitest';

import { replayItem } from '../../../_tests/fixtures';
import { replayFacets } from '../replay-facets';

const ITEMS = [
  replayItem({ map: '05_prohorovka', map_title: 'Прохоровка', vehicle: 'ussr-R04_T-34', nation: 'ussr', tank: 'Т-34', tier: 5, type: 'random' }),
  replayItem({ map: '02_malinovka', map_title: 'Малиновка', vehicle: 'ussr-R04_T-34', nation: 'ussr', tank: 'Т-34', tier: 5, type: 'random' }),
  replayItem({
    map: '02_malinovka',
    map_title: 'Малиновка',
    vehicle: 'germany-G04_PzVI_Tiger_I',
    nation: 'germany',
    tank: 'Tiger I',
    tier: 7,
    type: 'ranked'
  }),
  replayItem({ map: null, map_title: null, vehicle: null, nation: null, tank: null, tier: null, type: 'other' })
];

describe(replayFacets, () => {
  it('offers each map once, by name, with its count', () => {
    const facets = replayFacets(ITEMS);

    expect(facets.maps).toEqual([
      { value: '02_malinovka', label: 'Малиновка', count: 2 },
      { value: '05_prohorovka', label: 'Прохоровка', count: 1 }
    ]);
  });

  it('offers the most played vehicles first', () => {
    const facets = replayFacets(ITEMS);

    expect(facets.vehicles.map((option) => [option.value, option.count, option.tier])).toEqual([
      ['ussr-R04_T-34', 2, 5],
      ['germany-G04_PzVI_Tiger_I', 1, 7]
    ]);
  });

  it('offers the tiers in order', () => {
    const facets = replayFacets(ITEMS);

    expect(facets.tiers.map((option) => option.value)).toEqual([5, 7]);
  });

  it('offers the battle types in the fixed order', () => {
    const facets = replayFacets(ITEMS);

    expect(facets.types.map((option) => option.value)).toEqual(['random', 'ranked', 'other']);
  });

  it('offers the nations in the client order with their counts', () => {
    const facets = replayFacets(ITEMS);

    expect(facets.nations).toEqual([
      { value: 'ussr', label: 'ussr', count: 2 },
      { value: 'germany', label: 'germany', count: 1 }
    ]);
  });

  it('is empty without replays', () => {
    expect(replayFacets([])).toEqual({ maps: [], vehicles: [], tiers: [], types: [], nations: [] });
  });
});
