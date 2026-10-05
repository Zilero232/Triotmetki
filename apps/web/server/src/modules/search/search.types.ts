import type { PlayerSearchResult, SearchQuery } from '@otmetki/schemas';

export type TermsInput = {
  terms: string[];
  limit: number;
};

export type SearchInput = SearchQuery;

export type PlayerSearchOutcome = {
  results: PlayerSearchResult[];
  term: string | null;
};
