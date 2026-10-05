import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Follow, TankThreshold } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';
import type { NotificationService } from '../notification.service';

import { moeThresholdLevels, unknownVehicle } from '../../../reference';
import { THRESHOLD_DROP } from '../../config/watchers.constants';
import { ThresholdDropsService } from '../threshold-drops.service';

const PREVIOUS_DATE = new Date('2026-09-19T00:00:00.000Z');
const CURRENT_DATE = new Date('2026-09-26T00:00:00.000Z');

const threshold = (date: Date, p95: number): TankThreshold =>
  mock<TankThreshold>({ kind: 'moe', tankId: 1, source: 'otmetki', date, ...moeThresholdLevels({ p65: 2000, p85: 2500, p95, p100: null }) });

const createService = ({ current, previous }: { current: TankThreshold | null; previous: TankThreshold | null }) => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const notifications = mock<NotificationService>();

  prisma.follow.findMany.mockResolvedValue([mock<Follow>({ targetId: 1n })]);
  prisma.tankThreshold.findFirst.mockResolvedValueOnce(current).mockResolvedValueOnce(previous);
  catalog.summary.mockResolvedValue({ ...unknownVehicle(1), shortName: 'IS-7' });
  notifications.notifyTankFollowers.mockResolvedValue(3);

  return { service: new ThresholdDropsService(prisma, catalog, notifications), notifications };
};

describe('ThresholdDropsService.run', () => {
  it('notifies followers of a tank whose mark threshold dropped', async () => {
    const { service, notifications } = createService({ previous: threshold(PREVIOUS_DATE, 3000), current: threshold(CURRENT_DATE, 2800) });

    await expect(service.run()).resolves.toBe(3);

    expect(notifications.notifyTankFollowers).toHaveBeenCalledWith(
      expect.objectContaining({
        tankId: 1,
        notification: expect.objectContaining({ event: 'moeThresholdDropped', tankName: 'IS-7', mark: 3, from: 3000, to: 2800 }),
        dedupeKey: 'moe-drop-1-2026-09-26-3'
      })
    );
  });

  it('stays silent when the drop is within the tolerance', async () => {
    const barelyLower = 3000 * (1 - THRESHOLD_DROP.minDropPercent / 100);
    const { service, notifications } = createService({ previous: threshold(PREVIOUS_DATE, 3000), current: threshold(CURRENT_DATE, barelyLower) });

    await expect(service.run()).resolves.toBe(0);
    expect(notifications.notifyTankFollowers).not.toHaveBeenCalled();
  });

  it('stays silent for the first threshold of a tank', async () => {
    const { service, notifications } = createService({ previous: null, current: threshold(CURRENT_DATE, 2800) });

    await expect(service.run()).resolves.toBe(0);
    expect(notifications.notifyTankFollowers).not.toHaveBeenCalled();
  });

  it('stays silent for a tank without thresholds', async () => {
    const { service, notifications } = createService({ previous: null, current: null });

    await expect(service.run()).resolves.toBe(0);
    expect(notifications.notifyTankFollowers).not.toHaveBeenCalled();
  });
});
