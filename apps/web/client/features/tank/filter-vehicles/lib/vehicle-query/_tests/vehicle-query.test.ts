import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/shared/constants';

import { loadVehicleFilters, vehicleQuery } from '../vehicle-query';

const NO_FILTERS = loadVehicleFilters(new URLSearchParams());

describe('vehicleQuery', () => {
  it('sends empty lists when nothing is chosen', () => {
    expect(vehicleQuery(NO_FILTERS)).toEqual({ tiers: [], types: [], nations: [], statuses: [], roles: [] });
  });

  it('passes the chosen statuses and roles to the API', () => {
    expect(vehicleQuery({ ...NO_FILTERS, statuses: ['collector', 'reward'], roles: ['HT_break'] })).toMatchObject({
      statuses: ['collector', 'reward'],
      roles: ['HT_break']
    });
  });
});

describe('loadVehicleFilters', () => {
  it('reads the same filters from the URL that the page prefetches with', () => {
    const filters = loadVehicleFilters(
      new URLSearchParams('tiers=8,10&types=heavyTank&nations=ussr,germany&statuses=collector,reward&roles=HT_break')
    );

    expect(vehicleQuery(filters)).toEqual({
      tiers: [8, 10],
      types: ['heavyTank'],
      nations: ['ussr', 'germany'],
      statuses: ['collector', 'reward'],
      roles: ['HT_break']
    });
  });

  it('falls back to no filters for an unknown status or role', () => {
    const filters = loadVehicleFilters(new URLSearchParams('statuses=gold&roles=pilot'));

    expect(vehicleQuery(filters)).toEqual({ tiers: [], types: [], nations: [], statuses: [], roles: [] });
  });
});

describe('ROUTES.tanks.filtered', () => {
  it('links to a catalog URL the page reads back as the same filter', () => {
    const href = ROUTES.tanks.filtered({ nations: 'ussr', tiers: 8 });

    const filters = loadVehicleFilters(new URLSearchParams(href.split('?')[1]));

    expect(vehicleQuery(filters)).toMatchObject({ nations: ['ussr'], tiers: [8] });
  });
});
