import { LEARNING_CURVE } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TankSnapshotLatest } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppNotFoundException } from '../../../../common/exceptions';
import { TankLearningService } from '../tank-learning.service';
import { learningRow } from './tanks.fixtures';

const lastBucket = LEARNING_CURVE.bucketStarts.length - 1;

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.tankLearningCurve.findMany.mockResolvedValue([
    learningRow({ tankId: 1, bucket: 0, wins: 450 }),
    learningRow({ tankId: 1, bucket: lastBucket, wins: 520 })
  ]);

  prisma.tankSnapshotLatest.findUnique.mockResolvedValue(null);

  return { service: new TankLearningService(prisma), prisma };
};

const snapshot = (battles: number, wins: number) => mock<TankSnapshotLatest>({ battles, wins });

describe('TankLearningService.forTank', () => {
  it('builds every bucket of the curve for the tank', async () => {
    const { service } = createService();

    const learning = await service.forTank(1);

    expect(learning.tankId).toBe(1);
    expect(learning.buckets).toHaveLength(LEARNING_CURVE.bucketStarts.length);
  });
});

describe('TankLearningService.place', () => {
  it('refuses an account that never played the tank', async () => {
    const { service } = createService();

    await expect(service.place({ accountId: 7n, tankId: 1 })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('refuses a snapshot with zero battles', async () => {
    const { service, prisma } = createService();

    prisma.tankSnapshotLatest.findUnique.mockResolvedValue(snapshot(0, 0));

    await expect(service.place({ accountId: 7n, tankId: 1 })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('compares the player with the bucket of their battle count', async () => {
    const { service, prisma } = createService();

    prisma.tankSnapshotLatest.findUnique.mockResolvedValue(snapshot(1_000, 600));

    const place = await service.place({ accountId: 7n, tankId: 1 });

    expect(place).toMatchObject({ accountId: 7, battles: 1_000, winRate: 60, bucket: lastBucket, bucketWinRate: 52 });
    expect(place.delta).toBeCloseTo(8);
  });

  it('puts a player exactly on a bucket start into that bucket', async () => {
    const { service, prisma } = createService();

    prisma.tankSnapshotLatest.findUnique.mockResolvedValue(snapshot(LEARNING_CURVE.bucketStarts[1], 25));

    expect((await service.place({ accountId: 7n, tankId: 1 })).bucket).toBe(1);
  });

  it('has no delta when the bucket has no data', async () => {
    const { service, prisma } = createService();

    prisma.tankSnapshotLatest.findUnique.mockResolvedValue(snapshot(LEARNING_CURVE.bucketStarts[1], 25));

    expect(await service.place({ accountId: 7n, tankId: 1 })).toMatchObject({ bucketWinRate: null, delta: null });
  });
});
