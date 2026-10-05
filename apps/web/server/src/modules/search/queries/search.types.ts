import type { MapSearchResult } from '@otmetki/schemas';

import type { Database } from '../../../core';
import type { searchQueries } from './search.queries';

export type PlayerMatchRow = {
  accountId: number;
  nickname: string;
  clanTag: string | null;
  matchedNickname: string | null;
  wn8: number | null;
  battles: number | null;
  score: number;
  exact: boolean;
  term: string;
};

export type ClanMatchRow = {
  clanId: number;
  tag: string;
  name: string;
  membersCount: number;
  emblems: unknown;
  score: number;
  exact: boolean;
};

export type TankMatchRow = {
  tankId: number;
  score: number;
};

export type MapMatchRow = Omit<MapSearchResult, 'kind'> & {
  score: number;
};

export type SearchTermsInput = {
  db: Database;
  terms: string[];
  limit: number;
};

export type TermPatternsInput = {
  db: Database;
  terms: string[];
  pattern: (escapedTerm: string) => string;
};

export type SearchQueries = typeof searchQueries;
