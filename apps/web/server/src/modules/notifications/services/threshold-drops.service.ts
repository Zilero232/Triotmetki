import { Injectable } from '@nestjs/common';

import { toIsoDate } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { toMoeThresholdRecord, VehicleCatalogService } from '../../reference';
import { THRESHOLD_DROP } from '../config/watchers.constants';
import { thresholdDrops } from '../lib/threshold-drops/threshold-drops';
import { NotificationService } from './notification.service';

@Injectable()
export class ThresholdDropsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly notifications: NotificationService
  ) {}

  async run(): Promise<number> {
    const followed = await this.prisma.follow.findMany({
      where: { kind: 'tank', isFollowing: true, OR: [{ events: { has: 'moeThresholdDropped' } }, { events: { isEmpty: true } }] },
      distinct: ['targetId'],
      select: { targetId: true }
    });

    let sent = 0;

    for (const { targetId } of followed) {
      sent += await this.checkTank(Number(targetId));
    }

    return sent;
  }

  private async checkTank(tankId: number): Promise<number> {
    const current = await this.prisma.tankThreshold.findFirst({ where: { kind: 'moe', tankId }, orderBy: { date: 'desc' } });

    if (!current) {
      return 0;
    }

    const previous = await this.prisma.tankThreshold.findFirst({
      where: { kind: 'moe', tankId, source: current.source, date: { lt: current.date } },
      orderBy: { date: 'desc' }
    });

    if (!previous) {
      return 0;
    }

    const drops = thresholdDrops({
      previous: toMoeThresholdRecord(previous),
      current: toMoeThresholdRecord(current),
      minDropPercent: THRESHOLD_DROP.minDropPercent
    });

    if (drops.length === 0) {
      return 0;
    }

    const vehicle = await this.catalog.summary(tankId);
    let sent = 0;

    for (const drop of drops) {
      sent += await this.notifications.notifyTankFollowers({
        tankId,
        notification: { event: 'moeThresholdDropped', tankId, tankName: vehicle.shortName || vehicle.name, ...drop },
        dedupeKey: `moe-drop-${tankId}-${toIsoDate(current.date)}-${drop.mark}`
      });
    }

    return sent;
  }
}
