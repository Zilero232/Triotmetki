import { describe, expect, it } from 'vitest';

import type { VehicleRow } from '../vehicle-summary.types';

import { toVehicleSummary, unknownVehicle } from '../vehicle-summary.mappers';

const ROW: VehicleRow = {
  tankId: 1,
  name: 'Объект 268',
  shortName: 'Об. 268',
  slug: 'obj-268',
  nation: 'ussr',
  type: 'atSpg',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  tag: 'Object_268',
  images: null
};

const summaryOf = (row: VehicleRow) => toVehicleSummary({ row, status: 'researchable' });

describe('toVehicleSummary', () => {
  it('carries the status it is given', () => {
    expect(toVehicleSummary({ row: ROW, status: 'reward' }).status).toBe('reward');
  });

  it('maps the database vehicle type to the public one', () => {
    expect(summaryOf(ROW).type).toBe('AT-SPG');
  });

  it('reads images under their primary or fallback key', () => {
    const summary = summaryOf({
      ...ROW,
      images: { small: 'https://cdn.example/small.png', contour_icon: 'https://cdn.example/contour.png', preview: 'https://cdn.example/big.png' }
    });

    expect(summary.images).toEqual({
      small: 'https://cdn.example/small.png',
      contour: 'https://cdn.example/contour.png',
      big: 'https://cdn.example/big.png',
      large: 'https://raw.githubusercontent.com/unicum-gg/wot.assets/Lesta/gui/maps/shop/vehicles/600x450/Object_268.png'
    });
  });

  it('skips values that are not valid URLs and tries the next key', () => {
    const summary = summaryOf({ ...ROW, images: { small: 'not a url', small_icon: 'https://cdn.example/s.png', big: 42 } });

    expect(summary.images).toMatchObject({ small: 'https://cdn.example/s.png', contour: null, big: null });
  });

  it('returns empty images when the stored value is not an object', () => {
    expect(summaryOf({ ...ROW, images: 'https://cdn.example/x.png' }).images).toMatchObject({ small: null, contour: null, big: null });
  });

  it('has no large render for a vehicle without a client tag', () => {
    expect(summaryOf({ ...ROW, tag: null }).images.large).toBeNull();
  });
});

describe('unknownVehicle', () => {
  it('names the placeholder after the tank id', () => {
    expect(unknownVehicle(123)).toMatchObject({ tankId: 123, name: '#123', slug: '123' });
  });
});
