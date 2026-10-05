import type { MapStat } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import { MAP_ADVISOR } from '../../../config/map-advisor.constants';
import { mapHighlights, winRateDelta } from '../map-advisor';

const map = (arenaId: string, delta: number, battles: number = MAP_ADVISOR.minMapBattles): MapStat => ({
  arenaId,
  name: null,
  battles,
  winRate: 50 + delta,
  avgDamage: null,
  wn8: null,
  survivalRate: null,
  winRateDelta: delta
});

describe('winRateDelta', () => {
  it('is null when either side is unknown', () => {
    expect(winRateDelta({ winRate: null, average: 50 })).toBeNull();
    expect(winRateDelta({ winRate: 50, average: null })).toBeNull();
  });
});

describe('mapHighlights', () => {
  it('puts the worst maps first and ignores maps with too few battles', () => {
    const maps = [map('a', -10), map('b', -5), map('c', -20, MAP_ADVISOR.minMapBattles - 1), map('d', 8), map('e', 0)];
    const { weakMaps, strongMaps } = mapHighlights({ maps });

    expect(weakMaps).toEqual(['a', 'b']);
    expect(strongMaps).toEqual(['d']);
  });

  it('never lists a map as both weak and strong', () => {
    const { weakMaps, strongMaps } = mapHighlights({ maps: [map('a', -4), map('b', 4)] });

    expect(weakMaps.filter((id) => strongMaps.includes(id))).toEqual([]);
  });
});
