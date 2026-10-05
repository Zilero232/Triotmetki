import type { MyTankLearning, TankLearning } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { AccountLearningLookup } from '../tanks.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { clampPercentDelta, percentOf } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { bucketOf } from '../lib';
import { toTankLearning } from '../mappers';

@Injectable()
export class TankLearningService {
  constructor(private readonly prisma: PrismaService) {}

  async forTank(tankId: number): Promise<TankLearning> {
    const rows = await this.prisma.tankLearningCurve.findMany({ where: { tankId } });

    return toTankLearning({ tankId, rows });
  }

  async place({ accountId, tankId }: AccountLearningLookup): Promise<MyTankLearning> {
    const [snapshot, curve] = await Promise.all([
      this.prisma.tankSnapshotLatest.findUnique({
        where: { accountId_tankId_mode: { accountId, tankId, mode: 'random' } },
        select: { battles: true, wins: true }
      }),
      this.forTank(tankId)
    ]);

    if (!snapshot || snapshot.battles === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No battles on tank ${tankId} for this account yet`);
    }

    const bucket = bucketOf(snapshot.battles);
    const winRate = percentOf({ value: snapshot.wins, by: snapshot.battles });
    const bucketWinRate = curve.buckets[bucket]?.winRate ?? null;

    return {
      tankId,
      accountId: Number(accountId),
      battles: snapshot.battles,
      winRate,
      bucket,
      bucketWinRate,
      delta: winRate === null || bucketWinRate === null ? null : clampPercentDelta(winRate - bucketWinRate)
    };
  }
}
