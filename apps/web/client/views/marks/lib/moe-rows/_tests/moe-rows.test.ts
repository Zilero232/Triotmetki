import type { MoeRow } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import { areThresholdsMissing, filterByName, latestUpdate } from '../moe-rows';

const row = (name: string, slug: string, updatedAt: string | null): MoeRow => ({
  vehicle: {
    tankId: slug.length,
    name,
    shortName: name,
    slug,
    nation: 'ussr',
    type: 'heavyTank',
    tier: 10,
    isPremium: false,
    isCollectible: false,
    status: 'researchable',
    images: { small: null, contour: null, big: null }
  },
  moe: null,
  sweat: { moe: null, moeLevel: null, mastery: null, masteryLevel: null },
  mastery: null,
  trend: { p95Delta7d: null, p95Delta30d: null },
  updatedAt
});

const ROWS = [
  row('ИС-7', 'is-7', '2026-09-20T04:00:00+03:00'),
  row('Объект 277', 'object-277', '2026-09-24T04:00:00+03:00'),
  row('Т-62А', 't-62a', null)
];

describe('filterByName', () => {
  it('returns every row for a blank query', () => {
    expect(filterByName({ rows: ROWS, query: '  ' })).toHaveLength(ROWS.length);
  });

  it('ignores case, spaces and dashes in the tank name', () => {
    expect(filterByName({ rows: ROWS, query: 'ис7' }).map(({ vehicle }) => vehicle.slug)).toEqual(['is-7']);
  });

  it('matches the latin slug as well as the name', () => {
    expect(filterByName({ rows: ROWS, query: 'object' }).map(({ vehicle }) => vehicle.slug)).toEqual(['object-277']);
  });
});

describe('latestUpdate', () => {
  it('picks the most recent update among the rows', () => {
    expect(latestUpdate(ROWS)).toBe(ROWS[1].updatedAt);
  });

  it('has no date when nothing was ever updated', () => {
    expect(latestUpdate([ROWS[2]])).toBeNull();
  });
});

describe('areThresholdsMissing', () => {
  const tracked: MoeRow = {
    ...ROWS[0],
    moe: { tankId: 6, date: '2026-09-20', source: 'otmetki', p65: 2100, p85: 2900, p95: 3600, p100: 4400 }
  };

  it('reports missing thresholds when a threshold sort puts an untracked tank first', () => {
    expect(areThresholdsMissing({ rows: ROWS, sort: 'p95', isComplete: false })).toBe(true);
  });

  it('waits for every page when the sort does not push untracked tanks last', () => {
    expect(areThresholdsMissing({ rows: ROWS, sort: 'tier', isComplete: false })).toBe(false);
  });

  it('reports missing thresholds once every page is loaded without one', () => {
    expect(areThresholdsMissing({ rows: ROWS, sort: 'tier', isComplete: true })).toBe(true);
  });

  it('sees thresholds as soon as one tank has them', () => {
    expect(areThresholdsMissing({ rows: [...ROWS, tracked], sort: 'tier', isComplete: true })).toBe(false);
  });

  it('leaves an empty list to the empty state', () => {
    expect(areThresholdsMissing({ rows: [], sort: 'p95', isComplete: true })).toBe(false);
  });
});
