import { Injectable } from '@nestjs/common';
import { MOD_HANGAR } from '@otmetki/schemas';
import { match } from 'ts-pattern';

import type {
  BaselineInput,
  CreateGoalInput,
  Goal,
  GoalBattlesQueryInput,
  HangarGoalsInput,
  ModGoals,
  OwnedInput,
  UpdateGoalInput
} from '../me.types';

import { AppBadRequestException, AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../common/exceptions';
import { toNumber } from '../../../common/lib';
import { LIMIT_LOCK_SCOPE, lockedTransaction, PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { bonusTypesOfMode } from '../../reference';
import { GOALS, MOD_GOALS } from '../config';
import { goalBattles, goalWindow, hangarGoalsSince, isGoalEndAllowed } from '../lib';
import { toGoal, toModGoal } from '../mappers';

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService
  ) {}

  async list(userId: string): Promise<Goal[]> {
    const rows = await this.prisma.goal.findMany({ where: { userId }, orderBy: [{ status: 'asc' }, { endsAt: 'asc' }] });

    return rows.map(toGoal);
  }

  async hangar({ userId, accountId, now = new Date() }: HangarGoalsInput): Promise<ModGoals> {
    const since = hangarGoalsSince(now);

    const rows = await this.prisma.goal.findMany({
      where: {
        userId,
        accountId,
        OR: [
          { status: 'active', endsAt: { gte: since } },
          { status: { not: 'active' }, endsAt: { gte: since, lte: now } },
          { achievedAt: { gte: since } }
        ]
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: MOD_HANGAR.maxGoals
    });

    const goals = await Promise.all(
      rows.map(async (row) => {
        const window = goalWindow({ startsAt: row.startsAt, endsAt: row.endsAt, now });

        return toModGoal({ row, battles: await this.battlesIn({ accountId, tankId: row.tankId, window }) });
      })
    );

    return { account_id: toNumber(accountId), goals };
  }

  async create({ userId, accountId, metric, tankId, target, endsAt }: CreateGoalInput): Promise<Goal> {
    const account = BigInt(accountId);
    const ends = new Date(endsAt);
    const now = new Date();

    if (!isGoalEndAllowed({ endsAt: ends, now })) {
      throw new AppBadRequestException('VALIDATION_FAILED', `A goal must end within ${GOALS.maxDurationDays} days from now`);
    }

    const link = await this.prisma.userLestaAccount.findUnique({ where: { accountId: account } });

    if (link?.userId !== userId) {
      throw new AppForbiddenException('FORBIDDEN', 'Goals can be set only for your own linked accounts');
    }

    const baseline = await this.baseline({ accountId: account, metric, tankId: tankId ?? null });

    const row = await lockedTransaction({
      prisma: this.prisma,
      scope: LIMIT_LOCK_SCOPE.goals,
      key: userId,
      run: async (tx) => {
        const active = await tx.goal.count({ where: { userId, status: 'active' } });

        await this.entitlements.assertWithinLimit({ userId, key: 'goals', count: active });

        return tx.goal.create({
          data: {
            userId,
            accountId: account,
            metric,
            tankId: tankId ?? null,
            target,
            baseline: baseline ?? 0,
            current: baseline,
            startsAt: now,
            endsAt: ends
          }
        });
      }
    });

    return toGoal(row);
  }

  async update({ userId, id, target, endsAt, status }: UpdateGoalInput): Promise<Goal> {
    if (endsAt !== undefined && !isGoalEndAllowed({ endsAt: new Date(endsAt), now: new Date() })) {
      throw new AppBadRequestException('VALIDATION_FAILED', `A goal must end within ${GOALS.maxDurationDays} days from now`);
    }

    const existing = await this.prisma.goal.findFirst({ where: { id, userId } });

    if (!existing) {
      throw new AppNotFoundException('NOT_FOUND', 'Goal not found');
    }

    if (existing.status !== 'active') {
      throw new AppConflictException('GOAL_CLOSED', `The goal is already ${existing.status} and can no longer be changed`);
    }

    const row = await this.prisma.goal.update({
      where: { id },
      data: {
        ...(target === undefined ? {} : { target }),
        ...(endsAt === undefined ? {} : { endsAt: new Date(endsAt) }),
        ...(status === undefined ? {} : { status })
      }
    });

    return toGoal(row);
  }

  async remove({ userId, id }: OwnedInput): Promise<void> {
    const removed = await this.prisma.goal.deleteMany({ where: { id, userId } });

    if (removed.count === 0) {
      throw new AppNotFoundException('NOT_FOUND', 'Goal not found');
    }
  }

  private async battlesIn({ accountId, tankId, window }: GoalBattlesQueryInput): Promise<number> {
    if (window.to <= window.from) {
      return 0;
    }

    const tank = tankId === null ? {} : { tankId };

    const [modBattles, api] = await Promise.all([
      this.prisma.battle.count({
        where: { accountId, ...tank, battleType: { in: bonusTypesOfMode(MOD_GOALS.statsMode) }, startedAt: { gte: window.from, lte: window.to } }
      }),
      this.prisma.tankBattleDelta.aggregate({
        where: { accountId, ...tank, mode: MOD_GOALS.statsMode, capturedAt: { gt: window.from, lte: window.to } },
        _sum: { battles: true }
      })
    ]);

    return goalBattles({ modBattles, apiBattles: api._sum.battles });
  }

  private async baseline({ accountId, metric, tankId }: BaselineInput): Promise<number | null> {
    if (metric === 'battles') {
      return 0;
    }

    if (metric === 'moe') {
      const progress =
        tankId === null
          ? null
          : await this.prisma.playerTank.findUnique({ where: { accountId_tankId: { accountId, tankId } }, select: { moePercent: true } });

      return progress?.moePercent ?? null;
    }

    const rating =
      tankId === null
        ? await this.prisma.accountRating.findUnique({ where: { accountId_period: { accountId, period: 'overall' } } })
        : await this.prisma.accountTankRating.findUnique({ where: { accountId_tankId_period: { accountId, tankId, period: 'overall' } } });

    if (!rating) {
      return null;
    }

    return match(metric)
      .with('winRate', () => rating.winRate)
      .with('wn8', () => rating.wn8)
      .with('avgDamage', () => rating.avgDamage)
      .with('broneIndex', () => ('broneIndex' in rating ? rating.broneIndex : null))
      .exhaustive();
  }
}
