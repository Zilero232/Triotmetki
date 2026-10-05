import { Injectable } from '@nestjs/common';
import { firstBy, sortBy } from 'remeda';

import type { TankRarityItem, TankRarityQuery, TankRarityView } from '../achievements-rarity.types';

import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { ACHIEVEMENTS_VIEW } from '../config/view.constants';
import { rarityTier } from '../lib/rarity/rarity';

@Injectable()
export class TankRarityReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicles: VehicleCatalogService
  ) {}

  async list({ tier, type, sort }: TankRarityQuery): Promise<TankRarityView> {
    const [rows, catalog] = await Promise.all([this.prisma.tankRarity.findMany(), this.vehicles.all()]);

    const items = rows.flatMap((row): TankRarityItem[] => {
      const vehicle = catalog.get(row.tankId)?.summary;

      if (!vehicle || (tier !== undefined && vehicle.tier !== tier) || (type !== undefined && vehicle.type !== type)) {
        return [];
      }

      return [{ vehicle, owners: row.owners, share: row.share * ACHIEVEMENTS_VIEW.percentScale, tier: rarityTier(row.share) }];
    });

    const latest = firstBy(rows, [(row) => row.computedAt.getTime(), 'desc']);

    return {
      sample: latest?.sample ?? 0,
      computedAt: latest ? latest.computedAt.toISOString() : null,
      items: sortBy(items, [(item) => item.share, sort === 'rare' ? 'asc' : 'desc'], (item) => item.vehicle.tankId)
    };
  }
}
