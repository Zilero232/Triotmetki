import type { VehicleSummary } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import { compareArmorSlug, findArmorVehicle } from '../armor-vehicle';

const vehicle = (tankId: number, slug: string): VehicleSummary => ({
  tankId,
  name: slug.toUpperCase(),
  shortName: slug,
  slug,
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null, large: null }
});

const IS_7 = vehicle(7169, 'is-7');
const OBJECT_140 = vehicle(16897, 'object-140');
const VEHICLES = [IS_7, OBJECT_140];

describe('findArmorVehicle', () => {
  it('finds a tank by its slug', () => {
    expect(findArmorVehicle({ vehicles: VEHICLES, idOrSlug: 'is-7' })).toBe(IS_7);
  });

  it('finds a tank by its numeric id', () => {
    expect(findArmorVehicle({ vehicles: VEHICLES, idOrSlug: '16897' })).toBe(OBJECT_140);
  });

  it('is null before the catalog has loaded', () => {
    expect(findArmorVehicle({ vehicles: undefined, idOrSlug: 'is-7' })).toBeNull();
  });

  it('is null for an unknown slug', () => {
    expect(findArmorVehicle({ vehicles: VEHICLES, idOrSlug: 'missing' })).toBeNull();
  });
});

describe('compareArmorSlug', () => {
  it('compares against another tank', () => {
    expect(compareArmorSlug({ vs: 'object-140', slug: '7169', primaryId: IS_7.tankId, vehicles: VEHICLES })).toBe('object-140');
  });

  it('drops the primary tank even when the page was opened by its numeric id', () => {
    expect(compareArmorSlug({ vs: 'is-7', slug: '7169', primaryId: IS_7.tankId, vehicles: VEHICLES })).toBeNull();
  });

  it('drops the primary slug before the catalog has loaded', () => {
    expect(compareArmorSlug({ vs: 'is-7', slug: 'is-7', primaryId: undefined, vehicles: undefined })).toBeNull();
  });

  it('is null without a compared tank', () => {
    expect(compareArmorSlug({ vs: null, slug: 'is-7', primaryId: IS_7.tankId, vehicles: VEHICLES })).toBeNull();
  });
});
