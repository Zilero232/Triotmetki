import type { z } from 'zod';

import type {
  clanSearchResultSchema,
  mapSearchResultSchema,
  playerSearchResultSchema,
  searchQuerySchema,
  searchResponseSchema,
  searchResultSchema,
  tankSearchResultSchema
} from './search.schemas';

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type PlayerSearchResult = z.infer<typeof playerSearchResultSchema>;
export type ClanSearchResult = z.infer<typeof clanSearchResultSchema>;
export type TankSearchResult = z.infer<typeof tankSearchResultSchema>;
export type MapSearchResult = z.infer<typeof mapSearchResultSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
