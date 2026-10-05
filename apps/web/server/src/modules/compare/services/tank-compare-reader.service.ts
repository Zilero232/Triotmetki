import type { TankComparison } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { CompareTanksInput } from '../compare.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { COMPARE_PROFILE } from '../config/compare.constants';
import { pickProfile } from '../lib/compare-profile/compare-profile';
import { bestBySpec, numericSpecs } from '../lib/specs/specs';

@Injectable()
export class TankCompareReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async compare({ tankIds, profiles }: CompareTanksInput): Promise<TankComparison> {
    const stored = await this.prisma.vehicleProfile.findMany({ where: { tankId: { in: tankIds } } });

    const vehicles = await Promise.all(
      tankIds.map(async (tankId, index) => {
        const entry = await this.catalog.find(tankId);

        if (!entry) {
          throw new AppNotFoundException('TANK_NOT_FOUND', `No tank ${tankId}`);
        }

        const profile = pickProfile({ profiles: stored, tankId, wanted: profiles?.[index] });

        return {
          vehicle: entry.summary,
          profileId: profile?.profileId ?? COMPARE_PROFILE.fallback,
          specs: numericSpecs(profile?.data)
        };
      })
    );

    return {
      vehicles,
      best: bestBySpec(vehicles.map((vehicle) => ({ tankId: vehicle.vehicle.tankId, specs: vehicle.specs })))
    };
  }
}
