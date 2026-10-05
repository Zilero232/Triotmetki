import type { TechTree } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { buildTechTree } from '../lib/tech-tree/tech-tree';

@Injectable()
export class TechTreeReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async tree(nation: string): Promise<TechTree> {
    const [vehicles, entries] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { nation, isActive: true },
        select: { tankId: true, nextTanks: true, prevTankIds: true, priceCredit: true, priceGold: true }
      }),
      this.catalog.filter({ nations: [nation] })
    ]);

    if (vehicles.length === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No vehicles of nation ${nation}`);
    }

    return buildTechTree({ nation, vehicles, summaries: new Map(entries.map((entry) => [entry.summary.tankId, entry.summary])) });
  }
}
