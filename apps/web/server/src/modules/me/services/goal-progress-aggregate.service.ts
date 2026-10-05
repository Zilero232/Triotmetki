import type { TankTotals } from '@otmetki/ratings';

import { Injectable, Logger } from '@nestjs/common';
import { subMinutes } from 'date-fns';
import { chunk, unique } from 'remeda';

import type { Goal } from '../../../../generated';
import type { EvaluateGoalInput, GoalAtInput } from '../me.types';

import { errorMessage } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { NotificationService } from '../../notifications';
import { bonusTypesOfMode, ExpectedValuesReaderService } from '../../reference';
import { GOAL_PROGRESS } from '../config/goal-progress.constants';
import { MOD_GOALS } from '../config/me.constants';
import { goalCurrent, goalOutcome, isWindowMetric, windowTotals } from '../lib/goal-progress/goal-progress';
import { goalWindow } from '../lib/goal/goal';
import { toApiTankTotals, toModTankTotals } from '../mappers/goal-window.mappers';
import { API_DELTA_SUM, MOD_BATTLE_SUM } from '../selects/goal-window.selects';

@Injectable()
export class GoalProgressAggregateService {
  private readonly logger = new Logger(GoalProgressAggregateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expectedValues: ExpectedValuesReaderService,
    private readonly notifications: NotificationService
  ) {}

  async run(now = new Date()): Promise<number> {
    const goals = await this.dueGoals(now);

    if (goals.length === 0) {
      return 0;
    }

    const expected = goals.some((goal) => goal.metric === 'wn8') ? await this.expectedValues.all() : new Map();
    let updated = 0;
    let failed = 0;

    for (const goal of goals) {
      try {
        updated += (await this.evaluate({ goal, expected, now })) ? 1 : 0;
      } catch (error) {
        failed += 1;
        this.logger.error(`goal ${goal.id} could not be evaluated: ${errorMessage(error)}`);
      }
    }

    if (failed === goals.length) {
      throw new Error(`none of ${goals.length} due goals could be evaluated`);
    }

    return updated;
  }

  private async dueGoals(now: Date): Promise<Goal[]> {
    const since = subMinutes(now, GOAL_PROGRESS.lookbackMinutes);
    const tracked = await this.prisma.goal.groupBy({ by: ['accountId'], where: { status: 'active' } });
    const fresh: bigint[] = [];

    for (const accounts of chunk(
      tracked.map((row) => row.accountId),
      GOAL_PROGRESS.accountsChunk
    )) {
      const [battles, deltas] = await Promise.all([
        this.prisma.battle.groupBy({ by: ['accountId'], where: { accountId: { in: accounts }, receivedAt: { gte: since } } }),
        this.prisma.tankBattleDelta.groupBy({
          by: ['accountId'],
          where: { accountId: { in: accounts }, mode: MOD_GOALS.statsMode, capturedAt: { gte: since } }
        })
      ]);

      fresh.push(...battles.map((row) => row.accountId), ...deltas.map((row) => row.accountId));
    }

    return this.prisma.goal.findMany({
      where: { status: 'active', OR: [{ endsAt: { lte: now } }, { accountId: { in: unique(fresh) } }] },
      orderBy: { endsAt: 'asc' }
    });
  }

  private async evaluate({ goal, expected, now }: EvaluateGoalInput): Promise<boolean> {
    const tanks = isWindowMetric(goal.metric) ? await this.windowTanks({ goal, now }) : [];
    const level = isWindowMetric(goal.metric) ? null : await this.level(goal);
    const current = goalCurrent({ metric: goal.metric, tanks, expected, level }) ?? goal.current;
    const outcome = goalOutcome({ metric: goal.metric, current, target: goal.target, hasEnded: goal.endsAt <= now });

    if (current === goal.current && outcome === null) {
      return false;
    }

    const saved = await this.prisma.goal.updateMany({
      where: { id: goal.id, status: 'active' },
      data: { current, ...(outcome === null ? {} : { status: outcome }), ...(outcome === 'achieved' ? { achievedAt: now } : {}) }
    });

    if (saved.count > 0 && outcome === 'achieved') {
      await this.notifications.notify({
        userId: goal.userId,
        notification: { event: 'goalReached', goalId: goal.id, metric: goal.metric, target: goal.target },
        dedupeKey: `${GOAL_PROGRESS.dedupePrefix}${goal.id}`
      });
    }

    return saved.count > 0;
  }

  private async windowTanks({ goal, now }: GoalAtInput): Promise<TankTotals[]> {
    const window = goalWindow({ startsAt: goal.startsAt, endsAt: goal.endsAt, now });

    if (window.to <= window.from) {
      return [];
    }

    const tank = goal.tankId === null ? {} : { tankId: goal.tankId };

    const [mod, api] = await Promise.all([
      this.prisma.battle.groupBy({
        by: ['tankId', 'result'],
        where: {
          accountId: goal.accountId,
          ...tank,
          battleType: { in: bonusTypesOfMode(MOD_GOALS.statsMode) },
          startedAt: { gte: window.from, lte: window.to }
        },
        _count: { _all: true },
        _sum: MOD_BATTLE_SUM
      }),
      this.prisma.tankBattleDelta.groupBy({
        by: ['tankId'],
        where: { accountId: goal.accountId, ...tank, mode: MOD_GOALS.statsMode, capturedAt: { gt: window.from, lte: window.to } },
        _sum: API_DELTA_SUM
      })
    ]);

    return windowTotals({ mod: mod.map(toModTankTotals), api: api.map(toApiTankTotals) });
  }

  private async level({ accountId, metric, tankId }: Goal): Promise<number | null> {
    if (metric === 'moe') {
      const progress =
        tankId === null
          ? null
          : await this.prisma.playerTank.findUnique({ where: { accountId_tankId: { accountId, tankId } }, select: { moePercent: true } });

      return progress?.moePercent ?? null;
    }

    const rating = await this.prisma.accountRating.findUnique({
      where: { accountId_period: { accountId, period: 'overall' } },
      select: { broneIndex: true }
    });

    return rating?.broneIndex ?? null;
  }
}
