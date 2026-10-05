import { Inject, Injectable } from '@nestjs/common';
import { isNonNullish } from 'remeda';

import type { LestaClients } from '../../../../core';
import type { Vehicle } from '../../../../lib/lesta';
import type { ReferenceQueries } from '../providers/reference-queries.types';
import type { WriteSpecHistoryInput, WriteVehicleInput, WriteVehiclesInput } from '../reference.types';

import { toJsonValue } from '../../../../common/lib';
import { LESTA_CLIENTS, PrismaService } from '../../../../core';
import { vehicleImages } from '../../../../lib/lesta';
import { REFERENCE } from '../config/reference.constants';
import { previousTankIds, specDiff, toVehicleType, vehicleSlugs } from '../lib/encyclopedia';
import { REFERENCE_QUERIES } from '../providers/reference-queries.provider';

@Injectable()
export class VehicleSyncService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients,
    @Inject(REFERENCE_QUERIES) private readonly queries: ReferenceQueries
  ) {}

  async sync(gameVersionId: number): Promise<number> {
    const vehicles = Object.values(await this.clients.bulk.encyclopedia.allVehicles()).filter(isNonNullish);

    if (vehicles.length === 0) {
      return 0;
    }

    const written = await this.writeVehicles({ vehicles, gameVersionId });

    await this.prisma.vehicle.updateMany({ where: { tankId: { notIn: vehicles.map((vehicle) => vehicle.tank_id) } }, data: { isActive: false } });

    return written;
  }

  private async writeVehicles({ vehicles, gameVersionId }: WriteVehiclesInput): Promise<number> {
    const slugs = vehicleSlugs({ vehicles });
    const previous = previousTankIds(vehicles);
    const latest = await this.queries.latestSpecHistory({ db: this.prisma.$kysely, gameVersionId });
    const history = new Map(latest.map((row) => [row.tankId, row.specs]));

    let written = 0;

    for (const vehicle of vehicles) {
      const type = toVehicleType(vehicle.type);

      if (!type) {
        continue;
      }

      await this.writeVehicle({
        vehicle,
        type,
        slug: slugs.get(vehicle.tank_id) ?? `tank-${vehicle.tank_id}`,
        prevTankIds: previous.get(vehicle.tank_id) ?? []
      });

      await this.writeSpecHistory({ vehicle, gameVersionId, previousSpecs: history.get(vehicle.tank_id) });

      written += 1;
    }

    return written;
  }

  private async writeSpecHistory({ vehicle, gameVersionId, previousSpecs }: WriteSpecHistoryInput) {
    await this.prisma.vehicleSpecHistory.upsert({
      where: { tankId_gameVersionId: { tankId: vehicle.tank_id, gameVersionId } },
      create: {
        tankId: vehicle.tank_id,
        gameVersionId,
        specs: toJsonValue(vehicle.default_profile),
        diff: toJsonValue(specDiff({ previous: previousSpecs, next: vehicle.default_profile }))
      },
      update: { specs: toJsonValue(vehicle.default_profile) }
    });
  }

  private async writeVehicle({ vehicle, type, slug, prevTankIds }: WriteVehicleInput) {
    const data = {
      name: vehicle.name,
      shortName: vehicle.short_name ?? vehicle.name,
      nation: vehicle.nation,
      type,
      tier: vehicle.tier,
      tag: vehicle.tag ?? null,
      description: vehicle.description ?? null,
      isPremium: vehicle.is_premium,
      isGift: vehicle.is_gift ?? false,
      isWheeled: vehicle.is_wheeled ?? false,
      isActive: true,
      priceCredit: vehicle.price_credit ?? null,
      priceGold: vehicle.price_gold ?? null,
      specs: toJsonValue(vehicle.default_profile),
      prevTankIds,
      nextTanks: toJsonValue(vehicle.next_tanks),
      modulesTree: toJsonValue(vehicle.modules_tree),
      crew: toJsonValue(vehicle.crew)
    };

    const derived = vehicle.tag ? vehicleImages({ nation: vehicle.nation, tag: vehicle.tag }) : null;
    const images = vehicle.images ?? derived;

    await this.prisma.vehicle.upsert({
      where: { tankId: vehicle.tank_id },
      create: { tankId: vehicle.tank_id, slug, ...data, images: toJsonValue(images) },
      update: images ? { ...data, images: toJsonValue(images) } : data
    });

    await this.writeDefaultProfile(vehicle);
  }

  private async writeDefaultProfile(vehicle: Vehicle) {
    const profile = vehicle.default_profile;

    if (!profile) {
      return;
    }

    const profileId = profile.profile_id ?? REFERENCE.defaultProfileId;
    const moduleIds = Object.values(profile.modules ?? {}).filter((value): value is number => typeof value === 'number');
    const payload = { isDefault: true, moduleIds, data: toJsonValue(profile) };

    await this.prisma.vehicleProfile.upsert({
      where: { tankId_profileId: { tankId: vehicle.tank_id, profileId } },
      create: { tankId: vehicle.tank_id, profileId, ...payload },
      update: payload
    });
  }
}
