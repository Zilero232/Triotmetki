import { Injectable } from '@nestjs/common';
import { sortBy, unique } from 'remeda';

import type { Prisma } from '../../../../generated';
import type { ArchiveEntry, OfferArchive, OfferPage, OffersQuery } from '../shop.types';

import { paginate, toIso } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { OFFER_RETURN } from '../config/offers.constants';
import { offerAppearance, returnEstimate } from '../lib/offer-return/offer-return';
import { toOfferView } from '../mappers/shop-views.mappers';

@Injectable()
export class OfferReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ active, tankId, limit, offset }: OffersQuery): Promise<OfferPage> {
    const now = new Date();
    const where: Prisma.PremiumOfferWhereInput = {
      ...(tankId === undefined ? {} : { tankIds: { has: tankId } }),
      ...(active ? { OR: [{ endsAt: null }, { endsAt: { gt: now } }] } : {})
    };

    const page = await paginate({
      limit,
      offset,
      fetch: (window) =>
        this.prisma.premiumOffer.findMany({ where, orderBy: [{ startsAt: 'desc' }, { firstSeenAt: 'desc' }, { id: 'desc' }], ...window }),
      count: () => this.prisma.premiumOffer.count({ where })
    });

    const counts = await this.timesSeen(page.items.flatMap((row) => row.tankIds));

    return {
      ...page,
      items: page.items.map((offer) => toOfferView({ offer, timesSeen: Math.max(1, ...offer.tankIds.map((id) => counts.get(id) ?? 1)) }))
    };
  }

  async archive(tankId: number | undefined): Promise<OfferArchive> {
    const offers = await this.prisma.premiumOffer.findMany({
      where: tankId === undefined ? { tankIds: { isEmpty: false } } : { tankIds: { has: tankId } },
      orderBy: { firstSeenAt: 'asc' },
      select: { tankIds: true, startsAt: true, firstSeenAt: true, discountPercent: true }
    });

    const byTank = new Map<number, ArchiveEntry>();

    for (const offer of offers) {
      for (const id of offer.tankIds) {
        if (tankId !== undefined && id !== tankId) {
          continue;
        }

        const entry = byTank.get(id) ?? { appearances: [], lastDiscountPercent: null };

        entry.appearances.push(offerAppearance(offer));
        entry.lastDiscountPercent = offer.discountPercent ?? entry.lastDiscountPercent;
        byTank.set(id, entry);
      }
    }

    const vehicles = await this.prisma.vehicle.findMany({ where: { tankId: { in: [...byTank.keys()] } }, select: { tankId: true, name: true } });
    const names = new Map(vehicles.map((vehicle) => [vehicle.tankId, vehicle.name]));

    const archive = [...byTank.entries()].map(([id, entry]) => {
      const estimate = returnEstimate(entry.appearances);

      return {
        tankId: id,
        tankName: names.get(id) ?? null,
        timesSeen: estimate.timesSeen,
        lastSeenAt: toIso(estimate.lastSeenAt),
        lastDiscountPercent: entry.lastDiscountPercent,
        medianIntervalDays: estimate.medianIntervalDays,
        nextExpectedAt: toIso(estimate.nextExpectedAt)
      };
    });

    return sortBy(archive, [(item) => item.lastSeenAt ?? '', 'desc']).slice(0, OFFER_RETURN.archiveLimit);
  }

  private async timesSeen(tankIds: readonly number[]): Promise<Map<number, number>> {
    const ids = unique(tankIds);
    const counts = new Map<number, number>();

    if (ids.length === 0) {
      return counts;
    }

    const rows = await this.prisma.premiumOffer.findMany({ where: { tankIds: { hasSome: ids } }, select: { tankIds: true } });

    for (const row of rows) {
      for (const id of row.tankIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }

    return counts;
  }
}
