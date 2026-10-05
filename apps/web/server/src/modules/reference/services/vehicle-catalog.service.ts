import type { VehicleSummary } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

import type { CatalogEntry, VehicleFilter } from '../reference.types';

import { PrismaService } from '../../../core';
import { CATALOG } from '../config/catalog.constants';
import { matchesFilter } from '../lib/catalog-entry/catalog-entry';
import { toCatalogEntry } from '../mappers/catalog-entry.mappers';
import { unknownVehicle } from '../mappers/vehicle-summary.mappers';

@Injectable()
export class VehicleCatalogService {
  private readonly cache = new LRUCache<string, Map<number, CatalogEntry>>({
    max: 1,
    ttl: CATALOG.ttlMs,
    fetchMethod: () => this.load()
  });

  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<Map<number, CatalogEntry>> {
    return (await this.cache.fetch(CATALOG.key)) ?? new Map();
  }

  async summary(tankId: number): Promise<VehicleSummary> {
    const entries = await this.all();

    return entries.get(tankId)?.summary ?? unknownVehicle(tankId);
  }

  async find(tankId: number): Promise<CatalogEntry | null> {
    const entries = await this.all();

    return entries.get(tankId) ?? null;
  }

  async bySlug(slug: string): Promise<CatalogEntry | null> {
    const entries = await this.all();

    return [...entries.values()].find((entry) => entry.summary.slug === slug) ?? null;
  }

  async tiers(): Promise<Map<number, number>> {
    const entries = await this.all();

    return new Map([...entries.values()].map((entry) => [entry.summary.tankId, entry.summary.tier]));
  }

  async filter(filter: VehicleFilter): Promise<CatalogEntry[]> {
    const entries = await this.all();

    return [...entries.values()].filter((entry) => matchesFilter({ entry, filter }));
  }

  private async load(): Promise<Map<number, CatalogEntry> | undefined> {
    const [rows, offered] = await Promise.all([
      this.prisma.vehicle.findMany({ where: { isActive: true } }),
      this.prisma.premiumOffer.findMany({ select: { tankIds: true } })
    ]);

    const withOffers = new Set(offered.flatMap((offer) => offer.tankIds));

    return rows.length > 0 ? new Map(rows.map((row) => [row.tankId, toCatalogEntry({ row, hasOffers: withOffers.has(row.tankId) })])) : undefined;
  }
}
