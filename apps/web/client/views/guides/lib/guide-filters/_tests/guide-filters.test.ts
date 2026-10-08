import { describe, expect, it } from 'vitest';

import type { GuideFilters } from '../guide-filters.types';

import { hasActiveFilters, toGuideListQuery } from '../guide-filters';

const EMPTY: GuideFilters = { kind: null, tank: null, map: null, sort: 'recent' };

describe('toGuideListQuery', () => {
  it('sends no empty filters', () => {
    expect(toGuideListQuery({ filters: EMPTY, pageSize: 20 })).toEqual({ sort: 'recent', limit: 20 });
  });

  it('maps the tank and map filters to the server field names', () => {
    const query = toGuideListQuery({ filters: { ...EMPTY, kind: 'tank', tank: 1, map: 'malinovka', sort: 'popular' }, pageSize: 10 });

    expect(query).toMatchObject({ kind: 'tank', tankId: 1, arenaId: 'malinovka', sort: 'popular' });
  });

  it('drops an empty map value', () => {
    expect(toGuideListQuery({ filters: { ...EMPTY, map: '' }, pageSize: 10 })).not.toHaveProperty('arenaId');
  });
});

describe('hasActiveFilters', () => {
  it('ignores sort', () => {
    expect(hasActiveFilters({ ...EMPTY, sort: 'popular' })).toBe(false);
  });

  it('detects a kind, tank or map filter', () => {
    expect(hasActiveFilters({ ...EMPTY, kind: 'general' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY, tank: 1 })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY, map: 'himmelsdorf' })).toBe(true);
  });
});
