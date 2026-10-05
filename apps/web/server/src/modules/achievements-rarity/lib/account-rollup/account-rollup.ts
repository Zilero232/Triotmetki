import { sumBy } from 'remeda';
import { z } from 'zod';

import type { AccountRollup, AccountRollupInput, ObtainableRow } from './account-rollup.types';

import { ACHIEVEMENTS_AGGREGATE } from '../../config/aggregate.constants';
import { ACHIEVEMENTS_VIEW } from '../../config/view.constants';

const countsSchema = z.record(z.string(), z.number()).catch({});
const completionSections = new Set<string>(ACHIEVEMENTS_AGGREGATE.completionSections);

export const readCounts = (value: unknown): Record<string, number> => countsSchema.parse(value);

export const heldNames = (counts: Record<string, number>): string[] =>
  Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([name]) => name);

export const accountRollup = ({ counts, points, obtainable }: AccountRollupInput): AccountRollup => {
  const held = heldNames(counts).filter((name) => points.has(name));
  const obtained = held.filter((name) => obtainable.has(name)).length;

  return {
    held: held.length,
    points: sumBy(held, (name) => points.get(name) ?? 0),
    completion: obtainable.size > 0 ? (obtained / obtainable.size) * ACHIEVEMENTS_VIEW.percentScale : 0
  };
};

export const obtainableNames = (catalog: readonly ObtainableRow[]): Set<string> =>
  new Set(catalog.filter((row) => row.section !== null && completionSections.has(row.section)).map((row) => row.name));
