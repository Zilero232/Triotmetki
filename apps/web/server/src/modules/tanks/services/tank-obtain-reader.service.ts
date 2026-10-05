import type { TankObtain } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { TANK_OBTAIN } from '../config';
import { researchXp, tankSources } from '../lib';
import { toTankNewsLinks, toTankOffer } from '../mappers';
import { TankTraitsReaderService } from './tank-traits-reader.service';
import { VehicleSourcesService } from './vehicle-sources.service';

@Injectable()
export class TankObtainReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly traits: TankTraitsReaderService,
    private readonly sources: VehicleSourcesService
  ) {}

  async obtain(tankId: number): Promise<TankObtain> {
    const [entry, vehicle, offers, total, news, missions, editorial] = await Promise.all([
      this.traits.of(tankId),
      this.prisma.vehicle.findUnique({ where: { tankId }, select: { priceCredit: true, priceGold: true, prevTankIds: true } }),
      this.prisma.premiumOffer.findMany({ where: { tankIds: { has: tankId } }, orderBy: { lastSeenAt: 'desc' }, take: TANK_OBTAIN.offersLimit }),
      this.prisma.premiumOffer.count({ where: { tankIds: { has: tankId } } }),
      this.prisma.newsItem.findMany({
        where: { tankIds: { has: tankId } },
        orderBy: { publishedAt: 'desc' },
        take: TANK_OBTAIN.newsLimit,
        select: { title: true, url: true, publishedAt: true }
      }),
      this.sources.missionsFor(tankId),
      this.sources.forTank(tankId)
    ]);

    const parents = vehicle?.prevTankIds.length
      ? await this.prisma.vehicle.findMany({ where: { tankId: { in: vehicle.prevTankIds } }, select: { tankId: true, nextTanks: true } })
      : [];

    const researchFrom = await Promise.all(
      parents.map(async (parent) => ({ vehicle: await this.catalog.summary(parent.tankId), xp: researchXp({ nextTanks: parent.nextTanks, tankId }) }))
    );

    const status = entry?.traits.status ?? 'researchable';
    const spec = entry?.spec ?? { tags: [], role: null, notInShop: false };

    return {
      status,
      role: entry?.traits.role ?? null,
      sources: tankSources({ status, spec, hasOffers: total > 0 }),
      priceCredits: vehicle?.priceCredit ?? null,
      priceGold: vehicle?.priceGold ?? null,
      researchFrom,
      offers: {
        total,
        items: offers.map(toTankOffer)
      },
      news: news.flatMap(toTankNewsLinks),
      missions,
      editorial
    };
  }
}
