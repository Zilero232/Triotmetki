import type { VehicleSource, VehicleSourceMission } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { CreateVehicleSourceRequest } from '../tanks.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { rewardMissions } from '../lib/vehicle-sources/vehicle-sources';
import { toVehicleSourceView } from '../mappers/vehicle-sources.mappers';
import { VEHICLE_SOURCE_EVENT } from '../selects/vehicle-sources.selects';

@Injectable()
export class VehicleSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async forTank(tankId: number): Promise<VehicleSource[]> {
    const rows = await this.prisma.vehicleSource.findMany({
      where: { tankId },
      include: { event: VEHICLE_SOURCE_EVENT },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }]
    });

    return rows.map(toVehicleSourceView);
  }

  async missionsFor(tankId: number): Promise<VehicleSourceMission[]> {
    const version = await this.prisma.missionCampaign.findFirst({
      where: { gameVersion: { isTest: false } },
      orderBy: [{ gameVersion: { isCurrent: 'desc' } }, { gameVersionId: 'desc' }],
      select: { gameVersionId: true }
    });

    if (!version) {
      return [];
    }

    const [campaigns, operations] = await Promise.all([
      this.prisma.missionCampaign.findMany({
        where: { gameVersionId: version.gameVersionId },
        select: { campaignId: true, name: true, rewardTankId: true },
        orderBy: { campaignId: 'asc' }
      }),
      this.prisma.missionOperation.findMany({
        where: { gameVersionId: version.gameVersionId },
        select: { campaignId: true, operationId: true, name: true, rewardTankId: true },
        orderBy: { operationId: 'asc' }
      })
    ]);

    return rewardMissions({ tankId, campaigns, operations });
  }

  async create({ userId, input }: CreateVehicleSourceRequest): Promise<VehicleSource> {
    const event = input.eventSlug ? await this.prisma.gameEvent.findUnique({ where: { slug: input.eventSlug }, select: { id: true } }) : null;

    if (input.eventSlug && !event) {
      throw new AppNotFoundException('NOT_FOUND', `No event ${input.eventSlug}`);
    }

    const row = await this.prisma.vehicleSource.create({
      data: {
        tankId: input.tankId,
        kind: input.kind,
        title: input.title ?? null,
        url: input.url ?? null,
        note: input.note ?? null,
        eventId: event?.id ?? null,
        missionCampaignId: input.missionCampaignId ?? null,
        missionOperationId: input.missionOperationId ?? null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        createdByUserId: userId
      },
      include: { event: VEHICLE_SOURCE_EVENT }
    });

    return toVehicleSourceView(row);
  }

  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.vehicleSource.deleteMany({ where: { id } });

    if (count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No vehicle source ${id}`);
    }
  }
}
