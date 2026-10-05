import type { MoeRow } from '@otmetki/schemas';

import { isIncludedIn } from 'remeda';

import type { FilterByNameInput, ThresholdsMissingInput } from './moe-rows.types';

import { MOE_THRESHOLD_KEYS } from '../../config';

const normalize = (value: string) => value.toLocaleLowerCase('ru').replaceAll(/[\s\-_.]/g, '');

export const filterByName = ({ rows, query }: FilterByNameInput): MoeRow[] => {
  const needle = normalize(query);

  if (!needle) {
    return rows;
  }

  return rows.filter(({ vehicle }) => [vehicle.name, vehicle.shortName, vehicle.slug].some((value) => normalize(value).includes(needle)));
};

export const latestUpdate = (rows: MoeRow[]): string | null =>
  rows.reduce<string | null>((latest, { updatedAt }) => (updatedAt && (!latest || updatedAt > latest) ? updatedAt : latest), null);

export const areThresholdsMissing = ({ rows, sort, isComplete }: ThresholdsMissingInput): boolean => {
  if (rows.length === 0 || rows.some(({ moe }) => moe !== null)) {
    return false;
  }

  const isSortedByThreshold = isIncludedIn(sort, MOE_THRESHOLD_KEYS);

  return isComplete || isSortedByThreshold;
};
