import type { PlayerSearchResult, SearchResponse, SearchResult } from '@otmetki/schemas';

import { Inject, Injectable, Optional } from '@nestjs/common';
import { uniqueBy } from 'remeda';

import type { SearchQueries } from '../queries/search.types';
import type { PlayerSearchOutcome, SearchInput, TermsInput } from '../search.types';

import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { SEARCH_QUERIES } from '../config/tokens.constants';
import { searchCandidates } from '../lib/layout-switch/layout-switch';
import { toClanSearchResult, toDiscoveredPlayerResult, toMapSearchResult, toPlayerSearchResult } from '../mappers/search.mappers';
import { searchQueries } from '../queries/search.queries';
import { PlayerDiscoveryWriterService } from './player-discovery-writer.service';

@Injectable()
export class SearchReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discovery: PlayerDiscoveryWriterService,
    private readonly catalog: VehicleCatalogService,
    @Optional() @Inject(SEARCH_QUERIES) private readonly queries: SearchQueries = searchQueries
  ) {}

  async search({ q, kinds, limit }: SearchInput): Promise<SearchResponse> {
    const db = this.prisma.$kysely;
    const wants = (kind: SearchResult['kind']) => !kinds || kinds.length === 0 || kinds.includes(kind);
    const candidates = searchCandidates(q);

    const [players, clans, tanks, maps] = await Promise.all([
      wants('player') ? this.players({ terms: candidates.nicknames, limit }) : Promise.resolve({ results: [], term: null }),
      wants('clan') ? this.queries.clans({ db, terms: candidates.all, limit }) : Promise.resolve([]),
      wants('tank') ? this.queries.tanks({ db, terms: candidates.all, limit }) : Promise.resolve([]),
      wants('map') ? this.queries.maps({ db, terms: candidates.all, limit }) : Promise.resolve([])
    ]);

    const tankResults = await Promise.all(tanks.map(async (row) => ({ kind: 'tank' as const, vehicle: await this.catalog.summary(row.tankId) })));

    const results: SearchResult[] = [...players.results, ...clans.map(toClanSearchResult), ...tankResults, ...maps.map(toMapSearchResult)];

    return { query: q, correctedQuery: players.term && players.term !== q ? players.term : null, results };
  }

  private async players({ terms, limit }: TermsInput): Promise<PlayerSearchOutcome> {
    const rows = await this.queries.players({ db: this.prisma.$kysely, terms, limit });

    const local: PlayerSearchResult[] = rows.map(toPlayerSearchResult);

    const best = rows[0];

    if (best?.exact) {
      return { results: local, term: best.term };
    }

    const discovered = await this.discovery.discover(terms);

    const remote: PlayerSearchResult[] = discovered.map(toDiscoveredPlayerResult);

    const exactRemote = remote.filter((item) => terms.some((term) => term.toLowerCase() === item.nickname.toLowerCase()));
    const merged = uniqueBy([...exactRemote, ...local, ...remote], (item) => item.accountId).slice(0, limit);
    const term = exactRemote[0]
      ? (terms.find((candidate) => candidate.toLowerCase() === exactRemote[0]?.nickname.toLowerCase()) ?? null)
      : (best?.term ?? null);

    return { results: merged, term };
  }
}
