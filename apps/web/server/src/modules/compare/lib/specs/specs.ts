import { firstBy, isNumber, isPlainObject } from 'remeda';

import type { FlattenInput, JoinKeyInput, SpecsRow } from './specs.types';

import { SPECS } from '../../config/compare.constants';

const join = ({ prefix, key }: JoinKeyInput): string => (prefix ? `${prefix}${SPECS.separator}${key}` : key);

const flatten = ({ value, prefix, depth }: FlattenInput): [string, number][] => {
  if (isNumber(value) && Number.isFinite(value)) {
    return prefix ? [[prefix, value]] : [];
  }

  if (depth >= SPECS.maxDepth) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      isPlainObject(item) ? flatten({ value: item, prefix: join({ prefix, key: String(index) }), depth: depth + 1 }) : []
    );
  }

  if (!isPlainObject(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nested]) =>
    depth === 0 && SPECS.skip.includes(key) ? [] : flatten({ value: nested, prefix: join({ prefix, key }), depth: depth + 1 })
  );
};

export const numericSpecs = (value: unknown): Record<string, number> => Object.fromEntries(flatten({ value, prefix: '', depth: 0 }));

export const isLowerBetter = (key: string): boolean => SPECS.lowerIsBetter.includes(key.split(SPECS.separator).at(-1) ?? key);

export const bestBySpec = (rows: readonly SpecsRow[]): Record<string, number | null> => {
  const keys = new Set(rows.flatMap((row) => Object.keys(row.specs)));

  return Object.fromEntries(
    [...keys].map((key) => {
      const lowerWins = isLowerBetter(key);
      const candidates = rows.flatMap((row) => {
        const value = row.specs[key];

        return value === null || value === undefined ? [] : [{ tankId: row.tankId, value }];
      });

      const values = new Set(candidates.map((candidate) => candidate.value));

      if (candidates.length < 2 || values.size < 2) {
        return [key, null];
      }

      return [key, firstBy(candidates, [(candidate) => candidate.value, lowerWins ? 'asc' : 'desc'])?.tankId ?? null];
    })
  );
};
