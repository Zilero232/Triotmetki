import type { LeagueTier, LeagueZone } from '@otmetki/schemas';

import type { LeagueMembership } from '../../../../generated';
import type { RankedEntry } from '../lib/league/league.types';

export type ToLeagueEntryInput = {
  entry: RankedEntry;
  nicknames: ReadonlyMap<bigint, string>;
  own: ReadonlySet<bigint>;
  tier: LeagueTier | null;
  zone: LeagueZone | null;
};

export type StoredStandingRow = Pick<LeagueMembership, 'accountId' | 'battles' | 'rank' | 'value' | 'zone'>;
