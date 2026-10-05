import type { LeagueTier, LeagueZone } from '@otmetki/schemas';

import type { LEAGUE_DIVISION } from '../../config/leagues.constants';
import type { LeagueMetric, LeagueStats, RankedEntry } from '../league/league.types';

type DivisionRules = Pick<typeof LEAGUE_DIVISION, 'groupSize' | 'minRanked' | 'zoneShare'>;

export type NextTierInput = {
  tier: LeagueTier | null;
  zone: LeagueZone | null;
};

export type DivisionZonesInput = {
  tier: LeagueTier;
  entries: readonly Pick<RankedEntry, 'accountId' | 'value'>[];
  rules: Pick<DivisionRules, 'minRanked' | 'zoneShare'>;
};

export type DivisionZones = {
  zones: Map<bigint, LeagueZone>;
  promotionSlots: number;
  relegationSlots: number;
};

export type PlaceMembersInput = {
  groups: ReadonlyMap<number, number>;
  newcomers: readonly bigint[];
  groupSize: number;
};

export type DivisionStandingsInput = {
  tier: LeagueTier;
  stats: readonly LeagueStats[];
  metric: LeagueMetric;
  minBattles: number;
  rules: Pick<DivisionRules, 'minRanked' | 'zoneShare'>;
};

export type DivisionStanding = RankedEntry & {
  zone: LeagueZone;
};

export type DivisionStandings = Omit<DivisionZones, 'zones'> & {
  entries: DivisionStanding[];
};

export type TierMoves = {
  promotesTo: LeagueTier | null;
  relegatesTo: LeagueTier | null;
};
