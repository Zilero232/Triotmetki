import { Injectable } from '@nestjs/common';
import { firstBy, omit, sortBy, unique } from 'remeda';

import type { AchievementsCatalog, AchievementsQuery, CatalogEntry } from '../achievements-rarity.types';

import { PrismaService } from '../../../core';
import { byRarity, sortCatalog } from '../lib/catalog-sort/catalog-sort';
import { toAchievementItem } from '../mappers/catalog.mappers';
import { CATALOG_ROW_SELECT, RARITY_ROW_SELECT } from '../selects/catalog.selects';

@Injectable()
export class AchievementCatalogReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async entries(): Promise<CatalogEntry[]> {
    const [catalog, rarity] = await Promise.all([
      this.prisma.achievement.findMany({ select: CATALOG_ROW_SELECT }),
      this.prisma.achievementRarity.findMany({ select: RARITY_ROW_SELECT })
    ]);

    const byName = new Map(rarity.map((row) => [row.name, row]));

    return sortBy(catalog, (row) => row.order ?? Number.MAX_SAFE_INTEGER).map((row) => {
      const stored = byName.get(row.name);

      return {
        item: toAchievementItem({ row, rarity: stored }),
        order: row.order,
        sample: stored?.sample ?? 0,
        computedAt: stored?.computedAt ?? null
      };
    });
  }

  async catalog({ section, sort }: AchievementsQuery): Promise<AchievementsCatalog> {
    const entries = await this.entries();
    const items = entries.map((entry) => ({ ...entry.item, order: entry.order }));
    const scoped = section ? items.filter((item) => item.section === section) : items;
    const latest = firstBy(
      entries.filter((entry) => entry.computedAt !== null),
      [(entry) => entry.computedAt?.getTime() ?? 0, 'desc']
    );

    return {
      sample: Math.max(0, ...entries.map((entry) => entry.sample)),
      catalogSize: entries.length,
      sections: unique(items.flatMap((item) => (item.section === null ? [] : [item.section]))),
      rarest: byRarity(items.filter((item) => item.holders > 0)).map((item) => omit(item, ['order']))[0] ?? null,
      computedAt: latest?.computedAt?.toISOString() ?? null,
      items: sortCatalog({ items: scoped, sort }).map((item) => omit(item, ['order']))
    };
  }
}
