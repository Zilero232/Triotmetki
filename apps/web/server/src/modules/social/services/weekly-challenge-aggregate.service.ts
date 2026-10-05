import { Inject, Injectable, Logger } from '@nestjs/common';
import { groupBy, sumBy, unique } from 'remeda';

import type { WeekStats } from '../lib/challenges/challenges.types';
import type { WeeklyChallengeQueries } from '../queries/weekly-challenge.types';
import type { AwardBadgesInput, ChallengeBadgeContext, ChallengeResult, EvaluateChallengesInput, WeekStatsInput } from '../social.types';

import { toIsoDate, toJsonValue, weekWindow } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { NotificationService } from '../../notifications';
import { CHALLENGE_BADGES, WEEKLY_CHALLENGES } from '../config/challenges.constants';
import { SOCIAL_QUERY_TOKENS } from '../config/queries.constants';
import { challengeBadgeContextSchema } from '../dto/social.schemas';
import { badgeCodeOf, challengeProgress } from '../lib/challenges/challenges';
import { SnapshotEventsReaderService } from './snapshot-events-reader.service';

@Injectable()
export class WeeklyChallengeAggregateService {
  private readonly logger = new Logger(WeeklyChallengeAggregateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: SnapshotEventsReaderService,
    private readonly notifications: NotificationService,
    @Inject(SOCIAL_QUERY_TOKENS.weeklyChallenge) private readonly queries: WeeklyChallengeQueries
  ) {}

  async evaluate(now: Date): Promise<number> {
    const window = weekWindow(now);
    let cursor: bigint | null = null;
    let accounts = 0;
    let completed = 0;

    for (;;) {
      const links = await this.prisma.userLestaAccount.findMany({
        where: cursor === null ? {} : { accountId: { gt: cursor } },
        select: { accountId: true },
        distinct: ['accountId'],
        orderBy: { accountId: 'asc' },
        take: CHALLENGE_BADGES.accountsPerPage
      });

      const accountIds: bigint[] = links.map((link) => link.accountId);

      completed += accountIds.length === 0 ? 0 : await this.evaluatePage({ ...window, accountIds, now });
      accounts += accountIds.length;
      cursor = accountIds.at(-1) ?? cursor;

      if (accountIds.length < CHALLENGE_BADGES.accountsPerPage) {
        break;
      }
    }

    this.logger.log(`weekly challenges: ${accounts} accounts, ${completed} completed`);

    return completed;
  }

  private async evaluatePage({ accountIds, start, end, weekStart, now }: EvaluateChallengesInput): Promise<number> {
    const [stats, existing] = await Promise.all([
      this.weekStats({ accountIds, start, end }),
      this.prisma.weeklyChallengeProgress.findMany({
        where: { weekStart, accountId: { in: accountIds }, completedAt: { not: null } },
        select: { accountId: true, code: true }
      })
    ]);

    const done = new Set(existing.map((row) => `${row.accountId}:${row.code}`));
    const results = [...stats].flatMap(([accountId, own]) =>
      WEEKLY_CHALLENGES.map((definition): ChallengeResult => {
        const progress = challengeProgress({ definition, stats: own });

        return { accountId, definition, progress, isNewlyCompleted: progress >= definition.target && !done.has(`${accountId}:${definition.code}`) };
      })
    );

    await this.prisma.$transaction(
      results.map(({ accountId, definition, progress, isNewlyCompleted }) =>
        this.prisma.weeklyChallengeProgress.upsert({
          where: { accountId_weekStart_code: { accountId, weekStart, code: definition.code } },
          create: { accountId, weekStart, code: definition.code, progress, target: definition.target, completedAt: isNewlyCompleted ? now : null },
          update: { progress, target: definition.target, ...(isNewlyCompleted ? { completedAt: now } : {}) }
        })
      )
    );

    const completions = results.filter((result) => result.isNewlyCompleted);

    await this.awardBadges({ completions, weekStart });

    return completions.length;
  }

  private async awardBadges({ completions, weekStart }: AwardBadgesInput): Promise<void> {
    if (completions.length === 0) {
      return;
    }

    const badges = await this.prisma.accountBadge.findMany({
      where: {
        accountId: { in: unique(completions.map((completion) => completion.accountId)) },
        badgeCode: { in: unique(completions.map((completion) => badgeCodeOf(completion.definition))) }
      },
      select: { accountId: true, badgeCode: true, context: true }
    });

    const held = new Map(badges.map((badge) => [`${badge.accountId}:${badge.badgeCode}`, badge.context]));

    for (const { accountId, definition } of completions) {
      const badgeCode = badgeCodeOf(definition);
      const key = `${accountId}:${badgeCode}`;
      const stored = challengeBadgeContextSchema.partial().safeParse(held.get(key));
      const context: ChallengeBadgeContext = { times: (stored.data?.times ?? 0) + 1, lastWeek: toIsoDate(weekStart) };

      await this.prisma.accountBadge.upsert({
        where: { accountId_badgeCode: { accountId, badgeCode } },
        create: { accountId, badgeCode, context: toJsonValue(context) },
        update: { context: toJsonValue(context) }
      });

      if (!held.has(key)) {
        await this.notifications.notifyAccount({
          accountId,
          dedupeKey: `badge-${accountId}-${badgeCode}`,
          notification: { event: 'badgeAwarded', accountId: Number(accountId), badgeCode, title: definition.code }
        });
      }
    }
  }

  private async weekStats({ accountIds, start, end }: WeekStatsInput): Promise<Map<bigint, WeekStats>> {
    const [sessions, battles, deltas, marks] = await Promise.all([
      this.prisma.playSession.findMany({
        where: { accountId: { in: accountIds }, source: 'api', kind: 'day', startedAt: { gte: start, lt: end } },
        select: { accountId: true, battles: true, wins: true, spotted: true }
      }),
      this.queries.challengeBattles({ db: this.prisma.$kysely, accountIds: accountIds.map(Number), start, end }),
      this.prisma.tankBattleDelta.findMany({
        where: { accountId: { in: accountIds }, mode: 'random', battles: 1, capturedAt: { gte: start, lt: end } },
        select: { accountId: true, tankId: true, damageDealt: true }
      }),
      this.events.markCounts({ accountIds, since: start, until: end })
    ]);

    const vehicles = await this.prisma.vehicle.findMany({
      where: { tankId: { in: unique([...battles, ...deltas].map((row) => row.tankId)) } },
      select: { tankId: true, type: true }
    });

    const typeOf = new Map(vehicles.map((vehicle) => [vehicle.tankId, vehicle.type]));
    const byAccount = <T extends { accountId: bigint | number }>(rows: T[]) => groupBy(rows, (row) => String(row.accountId));
    const sessionsOf = byAccount(sessions);
    const modOf = byAccount(battles);
    const apiOf = byAccount(deltas);

    return new Map(
      accountIds.map((accountId): [bigint, WeekStats] => {
        const key = String(accountId);
        const own = sessionsOf[key] ?? [];
        const fromMod = modOf[key] ?? [];
        const fromApi = apiOf[key] ?? [];
        const source = fromMod.length >= fromApi.length ? fromMod : fromApi;

        return [
          accountId,
          {
            battles: sumBy(own, (row) => row.battles),
            wins: sumBy(own, (row) => row.wins),
            spotted: sumBy(own, (row) => row.spotted),
            marks: marks.get(accountId) ?? 0,
            bigDamage: source.map((row) => ({ damage: row.damageDealt, vehicleType: typeOf.get(row.tankId) ?? null }))
          }
        ];
      })
    );
  }
}
