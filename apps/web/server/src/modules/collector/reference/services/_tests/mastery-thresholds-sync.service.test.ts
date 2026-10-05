import { MASTERY_PERCENTILES } from '@otmetki/ratings';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Vehicle } from '../../../../../../generated';
import type { LestaClients, PrismaService } from '../../../../../core';

import { masteryThresholdLevels } from '../../../../reference';
import { REFERENCE } from '../../config/reference.constants';
import { MasteryThresholdsSyncService } from '../mastery-thresholds-sync.service';

const NOW = new Date('2026-09-26T15:00:00Z');

const distribution = {
  [MASTERY_PERCENTILES.third]: 100,
  [MASTERY_PERCENTILES.second]: 200,
  [MASTERY_PERCENTILES.first]: 300,
  [MASTERY_PERCENTILES.ace]: 400
};

const createSync = (vehicles: number[]) => {
  const prisma = mockDeep<PrismaService>();
  const clients = mockDeep<LestaClients>();

  prisma.vehicle.findMany.mockResolvedValue(vehicles.map((tankId) => mock<Vehicle>({ tankId })));
  prisma.$transaction.mockResolvedValue([]);

  return { prisma, clients, service: new MasteryThresholdsSyncService(prisma, clients) };
};

describe('MasteryThresholdsSyncService.sync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call Lesta before any vehicle is known', async () => {
    const { clients, prisma, service } = createSync([]);

    expect(await service.sync()).toEqual({ vehicles: 0 });
    expect(clients.bulk.tanks.mastery).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps today’s thresholds when Lesta returns an empty distribution', async () => {
    const { clients, prisma, service } = createSync([1]);

    clients.bulk.tanks.mastery.mockResolvedValue({});

    expect(await service.sync()).toEqual({ vehicles: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.tankThreshold.deleteMany).not.toHaveBeenCalled();
  });

  it('keeps today’s thresholds when no tank has a complete distribution', async () => {
    const { clients, prisma, service } = createSync([1]);

    clients.bulk.tanks.mastery.mockResolvedValue({ 1: { [MASTERY_PERCENTILES.third]: 100 } });

    await service.sync();

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps stored thresholds when the Lesta request fails', async () => {
    const { clients, prisma, service } = createSync([1]);

    clients.bulk.tanks.mastery.mockRejectedValue(new Error('SOURCE_NOT_AVAILABLE'));

    await expect(service.sync()).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replaces today’s thresholds and raw percentiles for the active vehicles', async () => {
    const { clients, prisma, service } = createSync([1, 2]);
    const today = new Date('2026-09-26T00:00:00Z');

    clients.bulk.tanks.mastery.mockResolvedValue({ 1: distribution });

    expect(await service.sync()).toEqual({ vehicles: 1, damageVehicles: 1 });

    expect(clients.bulk.tanks.mastery).toHaveBeenCalledWith(
      expect.objectContaining({ tankIds: [1, 2], distribution: REFERENCE.masteryDistribution })
    );

    expect(prisma.tankThreshold.deleteMany.mock.calls[0]?.[0]?.where).toEqual({ kind: 'mastery', source: 'lesta', date: today });

    expect(prisma.tankThreshold.createMany.mock.calls[0]?.[0]?.data).toEqual([
      {
        kind: 'mastery',
        tankId: 1,
        date: today,
        source: 'lesta',
        ...masteryThresholdLevels({ class3: 100, class2: 200, class1: 300, master: 400 })
      }
    ]);

    expect(prisma.tankPercentile.createMany.mock.calls[0]?.[0]?.data).toEqual([
      expect.objectContaining({ tankId: 1, distribution: REFERENCE.masteryDistribution })
    ]);
  });

  it('stores the damage distribution next to the xp one for the mark and threshold views', async () => {
    const { clients, prisma, service } = createSync([1]);

    clients.bulk.tanks.mastery.mockResolvedValue({ 1: distribution });

    await service.sync();

    expect(clients.bulk.tanks.mastery).toHaveBeenCalledWith(
      expect.objectContaining({ distribution: REFERENCE.damageDistribution, percentiles: REFERENCE.masteryPercentiles })
    );

    expect(prisma.tankPercentile.createMany.mock.calls.map(([args]) => args?.data)).toContainEqual([
      expect.objectContaining({ tankId: 1, distribution: REFERENCE.damageDistribution })
    ]);
  });
});
