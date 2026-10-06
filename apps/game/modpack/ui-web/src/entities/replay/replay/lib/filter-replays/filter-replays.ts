import { sortBy } from 'remeda';

import type { ReplayFilters, ReplayItem } from '../../model/schemas';
import type { FilterReplaysInput, MatchChoiceInput, MatchReplayInput } from './filter-replays.types';

import { DEFAULT_REPLAY_FILTERS, REPLAY_FILTER } from '../../config';

const haystack = (item: ReplayItem): string =>
  [item.title, item.map_title, item.map, item.tank, item.vehicle].filter(Boolean).join(' ').toLowerCase();

const withinPeriod = ({ item, filters, now }: MatchReplayInput): boolean =>
  filters.period === REPLAY_FILTER.all || now - item.time <= REPLAY_FILTER.periodSeconds[filters.period];

const matchesQuery = ({ item, filters }: MatchReplayInput): boolean => {
  const query = filters.query.trim().toLowerCase();

  return query === '' || haystack(item).includes(query);
};

const matchesChoice = <Value>({ chosen, actual }: MatchChoiceInput<Value>): boolean => chosen === null || actual === chosen;

const matchesFavourite = ({ item, filters }: MatchReplayInput): boolean => !filters.favourites || item.favourite;

export const matchesReplay = (input: MatchReplayInput): boolean => {
  const { item, filters } = input;

  const checks = [
    matchesQuery(input),
    matchesChoice({ chosen: filters.result, actual: item.result }),
    matchesChoice({ chosen: filters.map, actual: item.map }),
    matchesChoice({ chosen: filters.vehicle, actual: item.vehicle }),
    matchesChoice({ chosen: filters.nation, actual: item.nation }),
    matchesChoice({ chosen: filters.tier, actual: item.tier }),
    matchesChoice({ chosen: filters.type, actual: item.type }),
    matchesFavourite(input),
    withinPeriod(input)
  ];

  return checks.every(Boolean);
};

export const filterReplays = ({ items, filters, now }: FilterReplaysInput): ReplayItem[] =>
  sortBy(
    items.filter((item) => matchesReplay({ item, filters, now })),
    (item) => item[filters.sort] === null,
    [(item) => item[filters.sort] ?? 0, filters.descending ? 'desc' : 'asc'],
    [(item) => item.time, 'desc']
  );

export const activeFilterCount = (filters: ReplayFilters): number =>
  [
    filters.query.trim() !== '',
    filters.result !== null,
    filters.map !== null,
    filters.vehicle !== null,
    filters.nation !== null,
    filters.tier !== null,
    filters.type !== null,
    filters.period !== REPLAY_FILTER.all,
    filters.favourites
  ].filter(Boolean).length;

export const clearFilters = (filters: ReplayFilters): ReplayFilters => ({
  ...DEFAULT_REPLAY_FILTERS,
  sort: filters.sort,
  descending: filters.descending
});
