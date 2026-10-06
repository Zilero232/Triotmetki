import { describe, expect, it } from 'vitest';

import type { ReplayFilters } from '../../../model/schemas';

import { replayItem } from '../../../_tests/fixtures';
import { DEFAULT_REPLAY_FILTERS, REPLAY_FILTER } from '../../../config';
import { activeFilterCount, clearFilters, filterReplays, matchesReplay } from '../filter-replays';

const NOW = 1_790_600_000;
const DAY = 86_400;

const ITEMS = [
  replayItem({
    id: 'a',
    time: NOW - 600,
    map: '05_prohorovka',
    map_title: 'Прохоровка',
    tank: 'Т-34',
    vehicle: 'ussr-R04_T-34',
    nation: 'ussr',
    tier: 5,
    result: 'win',
    damage: 2150,
    favourite: true
  }),
  replayItem({
    id: 'b',
    time: NOW - 3 * DAY,
    map: '04_himmelsdorf',
    map_title: 'Химмельсдорф',
    tank: 'Tiger I',
    vehicle: 'germany-G04_PzVI_Tiger_I',
    nation: 'germany',
    tier: 7,
    result: 'loss',
    damage: 3400,
    type: 'ranked',
    favourite: false
  }),
  replayItem({
    id: 'c',
    time: NOW - 40 * DAY,
    map: '02_malinovka',
    map_title: 'Малиновка',
    tank: 'Т-34',
    vehicle: 'ussr-R04_T-34',
    nation: 'ussr',
    tier: 5,
    result: null,
    damage: null,
    favourite: false
  })
];

const ids = (filters: Partial<ReplayFilters>): string[] =>
  filterReplays({ items: ITEMS, filters: { ...DEFAULT_REPLAY_FILTERS, ...filters }, now: NOW }).map((item) => item.id);

const withFilters = (filters: Partial<ReplayFilters>): ReplayFilters => ({ ...DEFAULT_REPLAY_FILTERS, ...filters });

describe(filterReplays, () => {
  it('lists the newest first by default', () => {
    expect(ids({})).toEqual(['a', 'b', 'c']);
  });

  it.each([
    { query: 'ПРОХОР', expected: ['a'] },
    { query: 'т-34', expected: ['a', 'c'] },
    { query: '  tiger ', expected: ['b'] }
  ])('searches the map, the tank and the file name in any case: "$query"', ({ query, expected }) => {
    const visible = ids({ query });

    expect(visible).toEqual(expected);
  });

  it.each([
    { filters: { result: 'loss' }, expected: ['b'] },
    { filters: { map: '02_malinovka' }, expected: ['c'] },
    { filters: { vehicle: 'ussr-R04_T-34', tier: 5 }, expected: ['a', 'c'] },
    { filters: { type: 'ranked' }, expected: ['b'] },
    { filters: { favourites: true }, expected: ['a'] },
    { filters: { vehicle: 'ussr-R04_T-34', result: 'loss' }, expected: [] }
  ] as const)('combines the result, map, vehicle, tier, type and favourite filters: $filters', ({ filters, expected }) => {
    const visible = ids(filters);

    expect(visible).toEqual(expected);
  });

  it.each([
    { nation: 'ussr', expected: ['a', 'c'] },
    { nation: 'germany', expected: ['b'] },
    { nation: 'france', expected: [] }
  ] as const)('keeps only the replays of the $nation nation', ({ nation, expected }) => {
    const visible = ids({ nation });

    expect(visible).toEqual(expected);
  });

  it.each([
    { result: 'win', expected: ['a'] },
    { result: 'loss', expected: ['b'] },
    { result: 'draw', expected: [] }
  ] as const)('keeps only the replays with the $result result', ({ result, expected }) => {
    const visible = ids({ result });

    expect(visible).toEqual(expected);
  });

  it.each([
    { filters: { nation: 'ussr', result: 'win' }, expected: ['a'] },
    { filters: { nation: 'ussr', result: 'loss' }, expected: [] },
    { filters: { nation: 'germany', result: 'loss', type: 'ranked', period: 'week' }, expected: ['b'] },
    { filters: { nation: 'ussr', period: 'week', query: 'т-34' }, expected: ['a'] },
    { filters: { nation: 'ussr', tier: 5, descending: false }, expected: ['c', 'a'] }
  ] as const)('combines the nation and the result with the other filters: $filters', ({ filters, expected }) => {
    const visible = ids(filters);

    expect(visible).toEqual(expected);
  });

  it.each([
    { period: 'today', expected: ['a'] },
    { period: 'week', expected: ['a', 'b'] },
    { period: 'month', expected: ['a', 'b'] }
  ] as const)('keeps the $period period by the age of the battle', ({ period, expected }) => {
    const visible = ids({ period });

    expect(visible).toEqual(expected);
  });

  it('sorts by a stat from the highest and puts unknown values last', () => {
    expect(ids({ sort: 'damage' })).toEqual(['b', 'a', 'c']);
  });

  it('sorts by a stat from the lowest and still puts unknown values last', () => {
    expect(ids({ sort: 'damage', descending: false })).toEqual(['a', 'b', 'c']);
  });

  it('lists the oldest first when the time order is reversed', () => {
    expect(ids({ sort: 'time', descending: false })).toEqual(['c', 'b', 'a']);
  });
});

describe(matchesReplay, () => {
  const item = replayItem({ time: NOW - REPLAY_FILTER.periodSeconds.week });
  const filters = withFilters({ period: 'week' });

  it('treats a battle exactly on the period boundary as inside', () => {
    expect(matchesReplay({ item, filters, now: NOW })).toBe(true);
  });

  it('drops a battle one second past the period boundary', () => {
    expect(matchesReplay({ item, filters, now: NOW + 1 })).toBe(false);
  });
});

describe(activeFilterCount, () => {
  it('counts nothing for the default filters', () => {
    expect(activeFilterCount(DEFAULT_REPLAY_FILTERS)).toBe(0);
  });

  it('does not count the order or a blank query', () => {
    const filters = withFilters({ sort: 'xp', descending: false, query: '   ' });

    const count = activeFilterCount(filters);

    expect(count).toBe(0);
  });

  it('counts each filter that narrows the list', () => {
    const filters = withFilters({ tier: 5, favourites: true, period: 'week' });

    const count = activeFilterCount(filters);

    expect(count).toBe(3);
  });

  it('counts the nation and the result as two filters', () => {
    const filters = withFilters({ nation: 'ussr', result: 'win' });

    const count = activeFilterCount(filters);

    expect(count).toBe(2);
  });
});

describe(clearFilters, () => {
  it('drops every filter and keeps the order', () => {
    const filters = withFilters({ map: 'x', nation: 'ussr', result: 'win', sort: 'xp', descending: false });

    const cleared = clearFilters(filters);

    expect(cleared).toEqual({ ...DEFAULT_REPLAY_FILTERS, sort: 'xp', descending: false });
  });
});
