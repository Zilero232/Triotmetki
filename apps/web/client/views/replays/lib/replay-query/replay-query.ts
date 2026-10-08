import { nicknameSchema, REPLAY_MASTERY_LEVELS } from '@otmetki/schemas';
import { isIncludedIn } from 'remeda';

import type { ReplaySearchQuery } from '@/entities/replay/replay';

import type { ReplayFilters, ToSearchQueryInput } from './replay-query.types';

import { REPLAY_LIST, REPLAY_MINIMUMS } from '../../config';

const slugOrUndefined = (value: string | null): string | undefined => (value !== null && REPLAY_LIST.slugPattern.test(value) ? value : undefined);

const listOrUndefined = <T>(values: readonly T[]): T[] | undefined => (values.length > 0 ? [...values] : undefined);

const minimumOrUndefined = (value: number | null): number | undefined => (value !== null && value >= 0 ? value : undefined);

const clanOrUndefined = (clan: string): string | undefined => {
  const trimmed = clan.trim();

  return REPLAY_LIST.clanPattern.test(trimmed) ? trimmed : undefined;
};

const playerQuery = (player: string): string | undefined => {
  const parsed = nicknameSchema.safeParse(player);

  return parsed.success ? parsed.data : undefined;
};

export const toSearchQuery = ({ filters, limit }: ToSearchQueryInput): ReplaySearchQuery => ({
  sort: filters.sort,
  limit,
  tankId: filters.tank !== null && filters.tank > 0 ? filters.tank : undefined,
  arenaId: slugOrUndefined(filters.map),
  mode: slugOrUndefined(filters.mode),
  player: playerQuery(filters.player),
  clan: clanOrUndefined(filters.clan),
  result: filters.result ?? undefined,
  tiers: listOrUndefined(filters.tiers),
  types: listOrUndefined(filters.types),
  nations: listOrUndefined(filters.nations),
  minDamage: minimumOrUndefined(filters.minDamage),
  minAssist: minimumOrUndefined(filters.minAssist),
  minBlocked: minimumOrUndefined(filters.minBlocked),
  minFrags: minimumOrUndefined(filters.minFrags),
  mastery: filters.mastery !== null && isIncludedIn(filters.mastery, REPLAY_MASTERY_LEVELS) ? filters.mastery : undefined,
  version: filters.version?.trim() || undefined,
  tags: listOrUndefined(filters.tags)
});

export const hasActiveFilters = (filters: ReplayFilters): boolean =>
  [filters.tank, filters.map, filters.mode, filters.result, filters.mastery, filters.version, ...REPLAY_MINIMUMS.map((key) => filters[key])].some(
    (value) => value !== null
  ) ||
  [filters.tiers, filters.types, filters.nations, filters.tags].some((values) => values.length > 0) ||
  [filters.player, filters.clan].some((text) => text.trim().length > 0);

export const toSelectValue = (value: string | null): string => value ?? REPLAY_LIST.anyValue;

export const fromSelectValue = (value: string): string | null => (value === REPLAY_LIST.anyValue ? null : value);
