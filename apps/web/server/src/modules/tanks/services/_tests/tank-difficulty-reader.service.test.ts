import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';

import { TankDifficultyReaderService } from '../tank-difficulty-reader.service';
import { learningRow } from './tanks.fixtures';

const rows = [
  learningRow({ tankId: 1, bucket: 0, wins: 450 }),
  learningRow({ tankId: 1, bucket: 3, wins: 460 }),
  learningRow({ tankId: 2, bucket: 0, wins: 450 }),
  learningRow({ tankId: 2, bucket: 3, wins: 550 }),
  learningRow({ tankId: 3, bucket: 0, wins: 500 })
];

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.tankLearningCurve.findMany.mockResolvedValue(rows);

  return { service: new TankDifficultyReaderService(prisma), prisma };
};

describe('TankDifficultyReaderService.all', () => {
  it('grades a small learning gain as easy and a large one as hardcore', async () => {
    const { service } = createService();

    const all = await service.all();

    expect(all.get(1)).toBe('easy');
    expect(all.get(2)).toBe('hardcore');
  });

  it('leaves out a tank whose curve is too short to grade', async () => {
    const { service } = createService();

    expect((await service.all()).has(3)).toBe(false);
  });

  it('is empty when no curves were computed', async () => {
    const { service, prisma } = createService();

    prisma.tankLearningCurve.findMany.mockResolvedValue([]);

    expect((await service.all()).size).toBe(0);
  });

  it('loads the curves once for repeated calls', async () => {
    const { service, prisma } = createService();

    await service.all();
    await service.matching(['easy']);

    expect(prisma.tankLearningCurve.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('TankDifficultyReaderService.matching', () => {
  it('collects the tanks of any requested difficulty', async () => {
    const { service } = createService();

    expect([...(await service.matching(['easy', 'hardcore']))].sort()).toEqual([1, 2]);
    expect([...(await service.matching(['moderate']))]).toEqual([]);
  });
});
