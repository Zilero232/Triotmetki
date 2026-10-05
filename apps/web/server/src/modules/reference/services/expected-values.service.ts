import type { ExpectedValuesTable } from '@otmetki/ratings';

import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

import type { ExpectedValueRow } from './expected-values.types';

import { PrismaService } from '../../../core';
import { CATALOG } from '../config';

@Injectable()
export class ExpectedValuesService {
  private readonly cache = new LRUCache<string, ExpectedValuesTable>({
    max: 1,
    ttl: CATALOG.ttlMs,
    fetchMethod: () => this.load()
  });

  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<ExpectedValuesTable> {
    return (await this.cache.fetch(CATALOG.key)) ?? new Map();
  }

  private async load(): Promise<ExpectedValuesTable | undefined> {
    const rows = await this.prisma.$queryRaw<ExpectedValueRow[]>`
      SELECT DISTINCT ON (tank_id)
        tank_id AS "tankId", exp_damage AS "expDamage", exp_spotted AS "expSpotted", exp_frags AS "expFrags",
        exp_defense AS "expDefense", exp_win_rate AS "expWinRate"
      FROM wn8_expected_value
      ORDER BY tank_id, date DESC
    `;

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
