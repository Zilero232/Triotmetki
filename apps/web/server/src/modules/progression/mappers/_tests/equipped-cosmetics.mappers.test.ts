import { describe, expect, it } from 'vitest';

import { toCosmeticColumns, toEquippedCosmetics } from '../equipped-cosmetics.mappers';

describe('toEquippedCosmetics', () => {
  it('maps the user cosmetic columns to the equipped slots', () => {
    expect(toEquippedCosmetics({ cosmeticBadge: 'badge-plus', cosmeticFrame: null, cosmeticBanner: 'banner-steel' })).toEqual({
      badge: 'badge-plus',
      frame: null,
      banner: 'banner-steel'
    });
  });
});

describe('toCosmeticColumns', () => {
  it('keeps omitted slots undefined so they are left unchanged and clears slots sent as null', () => {
    expect(toCosmeticColumns({ badge: 'badge-plus', banner: null })).toEqual({
      cosmeticBadge: 'badge-plus',
      cosmeticFrame: undefined,
      cosmeticBanner: null
    });
  });
});
