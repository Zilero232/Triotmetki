import { Injectable, Logger } from '@nestjs/common';
import { PROGRESSION_REWARDS, TANK_CHALLENGES, TANK_LEVELS, tankLevelOf } from '@otmetki/schemas';
import { subDays } from 'date-fns';
import { range, sortBy } from 'remeda';

import type { BattleSample } from '../lib';
import type { AccountRunInput, ApplyXpInput, EvaluateChallengesInput, LoadSamplesInput, ProgressVehicle } from '../progression.types';

import { entitledSubscriptionWhere, errorMessage, toIsoDate, weekWindow } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { NotificationService } from '../../notifications';
import { PROGRESSION_RUN } from '../config';
import {
  battlesOf,
  challengeKey,
  challengeProgress,
  levelKey,
  pickSamplesByTank,
  sampleFromBattle,
  sampleFromDelta,
  weeklyTankChallenges,
  xpOfSamples
} from '../lib';
import { SeasonService } from './season.service';
import { ShellLedgerService } from './shell-ledger.service';

@Injectable()
export class ProgressionRunService {
  private readonly logger = new Logger(ProgressionRunService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: ShellLedgerService,
    private readonly seasons: SeasonService,
    private readonly notifications: NotificationService
  ) {}

  async run(now: Date): Promise<number> {
    const subscriptions = await this.prisma.subscription.findMany({ where: entitledSubscriptionWhere(now), select: { userId: true } });
    const links = await this.prisma.userLestaAccount.findMany({
      where: { userId: { in: subscriptions.map((subscription) => subscription.userId) } },
      select: { userId: true, accountId: true },
      take: PROGRESSION_RUN.maxAccountsPerRun
    });

    await this.prisma.player.updateMany({
      where: { accountId: { notIn: links.map((link) => link.accountId) }, progressionProcessedUntil: { lt: now } },
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

  private async evaluateChallenges({ userId, accountId, now, week: { start, weekStart } }: EvaluateChallengesInput): Promise<void> {
    const weekKey = toIsoDate(weekStart) ?? '';
    const samples = await this.loadSamples({ accountId, from: start, to: now });
    const tanks = sortBy([...samples], [([, rows]) => battlesOf(rows), 'desc']).slice(0, TANK_CHALLENGES.maxTanksPerWeek);
    const vehicles = await this.vehicles(tanks.map(([tankId]) => tankId));
    const hasModData =
      (await this.prisma.battle.findFirst({
        where: { accountId, startedAt: { gte: subDays(now, PROGRESSION_RUN.modLookbackDays) } },
        select: { id: true }
      })) !== null;

    const completedRows = await this.prisma.tankChallengeProgress.findMany({
      where: { accountId, weekStart, tankId: { in: tanks.map(([tankId]) => tankId) }, completedAt: { not: null } },
      select: { tankId: true, code: true }
    });

    const completed = new Set(completedRows.map((row) => `${row.tankId}:${row.code}`));

    for (const [tankId, rows] of tanks) {
      const challenges = weeklyTankChallenges({ seed: `${accountId}:${tankId}:${weekKey}`, tier: vehicles.get(tankId)?.tier ?? 1, hasModData });

      for (const challenge of challenges) {
        const key = { accountId_tankId_weekStart_code: { accountId, tankId, weekStart, code: challenge.code } };
        const progress = challengeProgress({ challenge, samples: rows });
        const justCompleted = progress >= challenge.target && !completed.has(`${tankId}:${challenge.code}`);
        const completion = justCompleted ? { completedAt: now } : {};

        await this.prisma.tankChallengeProgress.upsert({
          where: key,
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

        if (!justCompleted) {
          continue;
        }

        const rewardKey = challengeKey({ accountId, tankId, week: weekKey, code: challenge.code });
        const isGranted = await this.ledger.grant({
          userId,
          amount: PROGRESSION_REWARDS.challengeShells,
          reason: 'challenge',
          key: rewardKey,
          points: PROGRESSION_REWARDS.challengePoints,
          now,
          context: { tankId, week: weekKey, code: challenge.code }
        });

        if (isGranted) {
          await this.notifications.notify({
            userId,
            notification: {
              event: 'tankChallengeDone',
              tankId,
              tankName: vehicles.get(tankId)?.name ?? String(tankId),
              shells: PROGRESSION_REWARDS.challengeShells
            },
            dedupeKey: rewardKey
          });
        }
      }
    }
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
