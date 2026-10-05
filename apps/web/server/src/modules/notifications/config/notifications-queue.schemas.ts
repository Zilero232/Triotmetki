import { z } from 'zod';

import { GoalMetric, NotificationChannel } from '../../../../generated';

const accountId = z.number().int().positive();
const tankId = z.number().int().positive();
const mark = z.number().int().min(1).max(3);

const notificationChannelDbSchema = z.enum(NotificationChannel);

export const notificationSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('moeGained'),
    accountId,
    nickname: z.string(),
    tankId,
    tankName: z.string(),
    marks: mark,
    isFollowed: z.boolean().default(false)
  }),
  z.object({
    event: z.literal('moeThresholdDropped'),
    tankId,
    tankName: z.string(),
    mark,
    from: z.number().int().nonnegative(),
    to: z.number().int().nonnegative()
  }),
  z.object({
    event: z.literal('sessionFinished'),
    accountId,
    nickname: z.string(),
    sessionId: z.string(),
    battles: z.number().int().positive(),
    winRate: z.number().min(0).max(1),
    avgDamage: z.number().nonnegative(),
    wn8: z.number().nullable()
  }),
  z.object({
    event: z.literal('bonusCode'),
    code: z.string().min(1),
    description: z.string().nullable()
  }),
  z.object({
    event: z.literal('premiumOffer'),
    tankId,
    tankName: z.string(),
    discountPercent: z.number().int().min(1).max(100).nullable()
  }),
  z.object({
    event: z.literal('challengeResolved'),
    challengeId: z.string(),
    title: z.string(),
    isSucceeded: z.boolean()
  }),
  z.object({
    event: z.literal('clanEventReminder'),
    clanId: z.number().int().positive(),
    clanTag: z.string(),
    title: z.string(),
    startsAt: z.string().nullable()
  }),
  z.object({
    event: z.literal('clanWeeklyReport'),
    clanId: z.number().int().positive(),
    clanTag: z.string(),
    from: z.string(),
    report: z.object({
      events: z.number().int().nonnegative(),
      attendanceRate: z.number().min(0).max(1).nullable(),
      newCandidates: z.number().int().nonnegative(),
      inactiveMembers: z.number().int().nonnegative()
    })
  }),
  z.object({
    event: z.literal('badgeAwarded'),
    accountId,
    badgeCode: z.string().min(1),
    title: z.string()
  }),
  z.object({
    event: z.literal('replayOverflow'),
    stored: z.number().int().positive(),
    keep: z.number().int().positive(),
    daysLeft: z.number().int().positive(),
    deleteAt: z.string()
  }),
  z.object({
    event: z.literal('firstWinAvailable'),
    accountId,
    nickname: z.string(),
    available: z.number().int().positive()
  }),
  z.object({
    event: z.literal('watchlistDigest'),
    activePlayers: z.number().int().positive(),
    battles: z.number().int().nonnegative(),
    marksGained: z.number().int().nonnegative(),
    top: z
      .array(
        z.object({
          nickname: z.string(),
          battles: z.number().int().nonnegative(),
          winRate: z.number().min(0).max(100),
          marksGained: z.number().int().nonnegative()
        })
      )
      .max(10)
  }),
  z.object({
    event: z.literal('tankReturned'),
    tankId,
    tankName: z.string(),
    absentDays: z.number().int().positive().nullable(),
    discountPercent: z.number().int().min(1).max(100).nullable()
  }),
  z.object({
    event: z.literal('streamerLive'),
    slug: z.string(),
    displayName: z.string(),
    platform: z.string(),
    tankName: z.string().nullable()
  }),
  z.object({
    event: z.literal('competitionFinished'),
    competitionSlug: z.string(),
    title: z.string(),
    teamName: z.string(),
    rank: z.number().int().positive(),
    teams: z.number().int().positive()
  }),
  z.object({
    event: z.literal('tankLevelUp'),
    tankId,
    tankName: z.string(),
    level: z.number().int().positive(),
    shells: z.number().int().nonnegative()
  }),
  z.object({
    event: z.literal('tankChallengeDone'),
    tankId,
    tankName: z.string(),
    shells: z.number().int().nonnegative()
  }),
  z.object({
    event: z.literal('goalReached'),
    goalId: z.string(),
    metric: z.enum(GoalMetric),
    target: z.number()
  }),
  z.object({ event: z.literal('plusCheckoutOpen') }),
  z.object({
    event: z.literal('lestaRelinkRequired'),
    accountId,
    nickname: z.string()
  })
]);

export const deliverPayloadSchema = z.object({
  userId: z.string().min(1),
  dedupeKey: z.string().min(1).max(200),
  notification: notificationSchema,
  onlyChannels: z.array(notificationChannelDbSchema).optional()
});

export const digestSchema = z.object({
  battles: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  damageDealt: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  marksGained: z.number().int().nonnegative()
});

export const digestPayloadSchema = z.object({
  userId: z.string().min(1),
  weekKey: z.string().min(1),
  digest: digestSchema
});
