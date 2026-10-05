import { sortBy } from 'remeda';

import type { DivisionStanding } from '../lib/league-division/league-division.types';
import type { LeagueEntryView } from '../social.types';
import type { StoredStandingRow, ToLeagueEntryInput } from './league-entry.types';

export const toLeagueEntry = ({ entry, nicknames, own, tier, zone }: ToLeagueEntryInput): LeagueEntryView => ({
  rank: entry.rank,
  accountId: Number(entry.accountId),
  nickname: nicknames.get(entry.accountId) ?? null,
  isMe: own.has(entry.accountId),
  battles: entry.battles,
  value: entry.value,
  tier,
  zone
});

export const toStoredStandings = (rows: readonly StoredStandingRow[]): DivisionStanding[] =>
  sortBy(rows, [(row) => row.rank ?? Number.POSITIVE_INFINITY, 'asc'], [(row) => row.battles, 'desc']).map((row, index) => ({
    accountId: row.accountId,
    rank: row.rank ?? index + 1,
    battles: row.battles,
    value: row.value,
    zone: row.zone ?? 'stay'
  }));
