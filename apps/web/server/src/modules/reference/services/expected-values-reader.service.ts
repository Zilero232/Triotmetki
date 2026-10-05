import type { ExpectedValuesTable } from '@otmetki/ratings';

import { Inject, Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

import type { ExpectedValuesQueries } from '../queries/expected-values.types';

import { PrismaService } from '../../../core';
import { CATALOG } from '../config/catalog.constants';
import { REFERENCE_QUERY_TOKENS } from '../config/queries.constants';

@Injectable()
export class ExpectedValuesReaderService {
  private readonly cache = new LRUCache<string, ExpectedValuesTable>({
    max: 1,
    ttl: CATALOG.ttlMs,
    fetchMethod: () => this.load()
  });

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REFERENCE_QUERY_TOKENS.expectedValues) private readonly queries: ExpectedValuesQueries
  ) {}

  async all(): Promise<ExpectedValuesTable> {
    return (await this.cache.fetch(CATALOG.key)) ?? new Map();
  }

  private async load(): Promise<ExpectedValuesTable | undefined> {
    const rows = await this.queries.latestExpectedValues(this.prisma.$kysely);

    if (rows.length === 0) {
      return undefined;
    }

    return new Map(
      rows.map((row) => [
        row.tankId,
        {
          tankId: row.tankId,
          expDamage: row.expDamage,
          expSpot: row.expSpotted,
          expFrag: row.expFrags,
          expDef: row.expDefense,
          expWinRate: row.expWinRate
        }
      ])
    );
  }
}
