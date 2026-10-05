import type { TankReference } from '@otmetki/ratings';

import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

import { PrismaService } from '../../../core';
import { CATALOG } from '../config/catalog.constants';
import { parseBronyaReference } from '../lib/bronya-reference/bronya-reference';
import { BRONYA_REFERENCE } from '../lib/bronya-reference/bronya-reference.constants';

@Injectable()
export class BronyaReferencesService {
  private readonly cache = new LRUCache<string, Map<number, TankReference>>({
    max: 1,
    ttl: CATALOG.ttlMs,
    fetchMethod: () => this.load()
  });

  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<Map<number, TankReference>> {
    return (await this.cache.fetch(CATALOG.key)) ?? new Map();
  }

  private async load(): Promise<Map<number, TankReference>> {
    const latest = await this.prisma.tankPercentile.aggregate({ where: { distribution: BRONYA_REFERENCE.distribution }, _max: { date: true } });
    const date = latest._max.date;
    const rows = date ? await this.prisma.tankPercentile.findMany({ where: { distribution: BRONYA_REFERENCE.distribution, date } }) : [];

    return new Map(
      rows.flatMap((row) => {
        const reference = parseBronyaReference({ tankId: row.tankId, value: row.percentiles });

        return reference ? [[row.tankId, reference] as const] : [];
      })
    );
  }
}
