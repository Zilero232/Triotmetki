import { Injectable, Logger } from '@nestjs/common';
import { PROGRESSION_REWARDS, TANK_CHALLENGES, TANK_LEVELS, tankLevelOf } from '@otmetki/schemas';
import { subDays } from 'date-fns';
import { range, sortBy } from 'remeda';

import type { BattleSample } from '../lib/battle-samples/battle-samples.types';
import type {
  AccountRunInput,
  ApplyXpInput,
  ChallengeContext,
  ChallengeContextInput,
  EvaluateChallengesInput,
  LoadSamplesInput,
  ProgressVehicle,
  RecordChallengeInput,
  RewardChallengeInput
} from '../progression.types';

import { errorMessage, toIsoDate, weekWindow } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { entitledSubscriptionWhere } from '../../billing';
import { NotificationService } from '../../notifications';
import { PROGRESSION_RUN } from '../config/queue.constants';
import { battlesOf, pickSamplesByTank, sampleFromBattle, sampleFromDelta } from '../lib/battle-samples/battle-samples';
import { challengeKey, levelKey } from '../lib/ledger-keys/ledger-keys';
import { challengeProgress, weeklyTankChallenges } from '../lib/tank-challenges/tank-challenges';
import { xpOfSamples } from '../lib/tank-xp/tank-xp';
import { SeasonRewardsWriterService } from './season-rewards-writer.service';
import { ShellLedgerWriterService } from './shell-ledger-writer.service';

@Injectable()
export class ProgressionAggregateService {
  private readonly logger = new Logger(ProgressionAggregateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: ShellLedgerWriterService,
    private readonly seasons: SeasonRewardsWriterService,
    private readonly notifications: NotificationService
  ) {}

  async run(now: Date): Promise<number> {
    const subscriptions = await this.prisma.subscription.findMany({ where: entitledSubscriptionWhere(now), select: { userId: true } });
    const entitled = await this.prisma.userLestaAccount.findMany({
      where: { userId: { in: subscriptions.map((subscription) => subscription.userId) } },
      select: { userId: true, accountId: true },
      orderBy: [{ player: { progressionProcessedUntil: { sort: 'asc', nulls: 'first' } } }, { accountId: 'asc' }]
    });

    const links = entitled.slice(0, PROGRESSION_RUN.maxAccountsPerRun);

    await this.prisma.player.updateMany({
      where: { accountId: { notIn: entitled.map((link) => link.accountId) }, progressionProcessedUntil: { lt: now } },
      data: { progressionProcessedUntil: now }
    });

    let processed = 0;

    for (const link of links) {
      try {
        await this.runAccount({ userId: link.userId, accountId: link.accountId, now });
        processed += 1;
      } catch (error) {
        this.logger.warn(`progression for ${link.accountId} failed: ${errorMessage(error)}`);
      }
    }

    for (const userId of new Set(links.map((link) => link.userId))) {
      await this.seasons.claimRewards({ userId, now });
    }

    this.logger.log(`progression: ${processed} of ${links.length} accounts`);

    return processed;
  }

  private async runAccount({ userId, accountId, now }: AccountRunInput): Promise<void> {
    const week = weekWindow(now);
    const cursor = await this.prisma.player.findUnique({ where: { accountId }, select: { progressionProcessedUntil: true } });
    const from = cursor?.progressionProcessedUntil ?? week.start;
    const fresh = await this.loadSamples({ accountId, from, to: now });
    const vehicles = await this.vehicles([...fresh.keys()]);
    const gains = new Map(
      [...fresh].map(([tankId, samples]) => [
        tankId,
        { xp: xpOfSamples({ samples, tier: vehicles.get(tankId)?.tier ?? 1 }), battles: battlesOf(samples) }
      ])
    );

    await this.applyXp({ userId, accountId, now, gains, vehicles });
    await this.evaluateChallenges({ userId, accountId, now, week });
  }

  private async applyXp({ userId, accountId, now, gains, vehicles }: ApplyXpInput): Promise<void> {
    const earned = [...gains].filter(([, gain]) => gain.xp > 0);
    const current = await this.prisma.playerTank.findMany({
      where: { accountId, tankId: { in: earned.map(([tankId]) => tankId) } },
      select: { tankId: true, progressXp: true, progressLevel: true }
    });

    const before = new Map(current.map((row) => [row.tankId, row]));
    const updates = earned.map(([tankId, gain]) => {
      const row = before.get(tankId);

      return { tankId, gain, previous: row?.progressLevel ?? 1, level: tankLevelOf((row?.progressXp ?? 0) + gain.xp).level };
    });

    for (const { tankId, previous, level } of updates) {
      let shells = 0;

      for (const reached of range(previous + 1, level + 1)) {
        const amount = PROGRESSION_REWARDS.levelShells + (reached === TANK_LEVELS.max ? PROGRESSION_REWARDS.maxLevelShells : 0);
        const isGranted = await this.ledger.grant({
          userId,
          amount,
          reason: 'level',
          key: levelKey({ accountId, tankId, level: reached }),
          points: PROGRESSION_REWARDS.levelPoints,
          now,
          context: { tankId, level: reached }
        });

        shells += isGranted ? amount : 0;
      }

      if (shells > 0) {
        await this.notifications.notify({
          userId,
          notification: { event: 'tankLevelUp', tankId, tankName: vehicles.get(tankId)?.name ?? String(tankId), level, shells },
          dedupeKey: levelKey({ accountId, tankId, level })
        });
      }
    }

    await this.prisma.$transaction([
      ...updates.map(({ tankId, gain, level }) =>
        this.prisma.playerTank.upsert({
          where: { accountId_tankId: { accountId, tankId } },
          create: { accountId, tankId, progressXp: gain.xp, progressLevel: level, progressBattles: gain.battles },
          update: { progressXp: { increment: gain.xp }, progressLevel: level, progressBattles: { increment: gain.battles } }
        })
      ),
      this.prisma.player.updateMany({ where: { accountId }, data: { progressionProcessedUntil: now } })
    ]);
  }

  private async evaluateChallenges({ userId, accountId, now, week }: EvaluateChallengesInput): Promise<void> {
    const weekKey = toIsoDate(week.weekStart) ?? '';
    const { tanks, vehicles, hasModData, completed } = await this.challengeContext({ accountId, now, week });

    for (const [tankId, samples] of tanks) {
      const challenges = weeklyTankChallenges({ seed: `${accountId}:${tankId}:${weekKey}`, tier: vehicles.get(tankId)?.tier ?? 1, hasModData });

      for (const challenge of challenges) {
        const isNewlyCompleted = await this.recordChallenge({
          accountId,
          tankId,
          weekStart: week.weekStart,
          now,
          challenge,
          samples,
          wasCompleted: completed.has(`${tankId}:${challenge.code}`)
        });

        if (isNewlyCompleted) {
          await this.rewardChallenge({
            userId,
            accountId,
            tankId,
            weekKey,
            code: challenge.code,
            now,
            tankName: vehicles.get(tankId)?.name ?? String(tankId)
          });
        }
      }
    }
  }

  private async challengeContext({ accountId, now, week: { start, weekStart } }: ChallengeContextInput): Promise<ChallengeContext> {
    const samples = await this.loadSamples({ accountId, from: start, to: now });
    const tanks = sortBy([...samples], [([, rows]) => battlesOf(rows), 'desc']).slice(0, TANK_CHALLENGES.maxTanksPerWeek);
    const tankIds = tanks.map(([tankId]) => tankId);
    const [vehicles, modBattle, completedRows] = await Promise.all([
      this.vehicles(tankIds),
      this.prisma.battle.findFirst({
        where: { accountId, startedAt: { gte: subDays(now, PROGRESSION_RUN.modLookbackDays) } },
        select: { id: true }
      }),
      this.prisma.tankChallengeProgress.findMany({
        where: { accountId, weekStart, tankId: { in: tankIds }, completedAt: { not: null } },
        select: { tankId: true, code: true }
      })
    ]);

    return {
      tanks,
      vehicles,
      hasModData: modBattle !== null,
      completed: new Set(completedRows.map((row) => `${row.tankId}:${row.code}`))
    };
  }

  private async recordChallenge({ accountId, tankId, weekStart, now, challenge, samples, wasCompleted }: RecordChallengeInput): Promise<boolean> {
    const progress = challengeProgress({ challenge, samples });
    const isNewlyCompleted = progress >= challenge.target && !wasCompleted;
    const completion = isNewlyCompleted ? { completedAt: now } : {};

    await this.prisma.tankChallengeProgress.upsert({
      where: { accountId_tankId_weekStart_code: { accountId, tankId, weekStart, code: challenge.code } },
      create: {
        accountId,
        tankId,
        weekStart,
        code: challenge.code,
        metric: challenge.metric,
        threshold: challenge.threshold,
        target: challenge.target,
        progress,
        ...completion
      },
      update: { progress, ...completion }
    });

    return isNewlyCompleted;
  }

  private async rewardChallenge({ userId, accountId, tankId, weekKey, code, now, tankName }: RewardChallengeInput): Promise<void> {
    const rewardKey = challengeKey({ accountId, tankId, week: weekKey, code });
    const isGranted = await this.ledger.grant({
      userId,
      amount: PROGRESSION_REWARDS.challengeShells,
      reason: 'challenge',
      key: rewardKey,
      points: PROGRESSION_REWARDS.challengePoints,
      now,
      context: { tankId, week: weekKey, code }
    });

    if (!isGranted) {
      return;
    }

    await this.notifications.notify({
      userId,
      notification: { event: 'tankChallengeDone', tankId, tankName, shells: PROGRESSION_REWARDS.challengeShells },
      dedupeKey: rewardKey
    });
  }

  private async loadSamples({ accountId, from, to }: LoadSamplesInput): Promise<Map<number, BattleSample[]>> {
    const [deltas, battles] = await Promise.all([
      this.prisma.tankBattleDelta.findMany({
        where: { accountId, mode: 'random', capturedAt: { gt: from, lte: to } },
        select: { tankId: true, battles: true, wins: true, damageDealt: true, spotted: true, frags: true, damageBlocked: true, survived: true }
      }),
      this.prisma.battle.findMany({
        where: { accountId, receivedAt: { gt: from, lte: to } },
        select: {
          tankId: true,
          result: true,
          damageDealt: true,
          spotted: true,
          frags: true,
          damageBlocked: true,
          survived: true,
          moePercentDelta: true
        }
      })
    ]);

    return pickSamplesByTank({ api: deltas.map(sampleFromDelta), mod: battles.map(sampleFromBattle) });
  }

  private async vehicles(tankIds: number[]): Promise<Map<number, ProgressVehicle>> {
    const rows = await this.prisma.vehicle.findMany({
      where: { tankId: { in: tankIds } },
      select: { tankId: true, tier: true, name: true, shortName: true }
    });

    return new Map(rows.map((row) => [row.tankId, { tier: row.tier, name: row.shortName || row.name }]));
  }
}
