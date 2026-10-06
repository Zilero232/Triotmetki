import { REPLAY_FILTER, REPLAYS } from '@/entities/replay/replay';
import { romanTier } from '@/shared/lib/format-number';

import type { ReplaysText } from '../replays-text';
import type { FacetOptions, FilterOptionsInput, ResultOption, SortOption } from './filter-options.types';

const counted = (count: number): string => String(count);

export const filterOptions = ({ facets, t }: FilterOptionsInput): FacetOptions => ({
  maps: [{ value: null, label: t('anyMap') }, ...facets.maps.map((map) => ({ ...map, hint: counted(map.count) }))],
  vehicles: [
    { value: null, label: t('anyVehicle') },
    ...facets.vehicles.map((vehicle) => ({
      value: vehicle.value,
      label: [romanTier(vehicle.tier), vehicle.label].filter(Boolean).join(' '),
      hint: counted(vehicle.count)
    }))
  ],
  nations: [
    { value: null, label: t('anyNation') },
    ...facets.nations.map((nation) => ({ value: nation.value, label: t(`nation_${nation.value}`), hint: counted(nation.count) }))
  ],
  tiers: [
    { value: null, label: t('any') },
    ...facets.tiers.map((tier) => ({ value: tier.value, label: romanTier(tier.value) ?? tier.label, hint: counted(tier.count) }))
  ],
  types: [
    { value: null, label: t('any') },
    ...facets.types.map((type) => ({ value: type.value, label: t(`type_${type.value}`), hint: counted(type.count) }))
  ],
  periods: REPLAY_FILTER.periods.map((period) => ({ value: period, label: t(`period_${period}`) }))
});

export const resultOptions = (t: ReplaysText): ResultOption[] => [
  { value: REPLAY_FILTER.all, label: t('resultAll') },
  ...REPLAYS.results.map((result) => ({ value: result, label: t(`result_${result}`) }))
];

export const sortOptions = (t: ReplaysText): SortOption[] => REPLAY_FILTER.sorts.map((sort) => ({ value: sort, label: t(`sort_${sort}`) }));
