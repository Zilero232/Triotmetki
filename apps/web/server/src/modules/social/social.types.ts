import type { CreateFollowInput as CreateFollowBody, Follow } from '@otmetki/schemas';
import type { z } from 'zod';

import type { WeekWindow } from '../../common/lib';
import type {
  challengeBadgeContextSchema,
  challengeRuleSchema,
  challengesSchema,
  feedBadgeSchema,
  feedItemSchema,
  leagueEntrySchema,
  leagueQuerySchema,
  leagueSchema,
  wrappedSchema
} from './dto/social.schemas';
import type { ChallengeDefinition } from './lib/challenges/challenges.types';
import type { LeagueMetric } from './lib/league/league.types';

export type FollowView = Follow;
export type FeedItem = z.infer<typeof feedItemSchema>;
export type FeedBadgeView = z.infer<typeof feedBadgeSchema>;
export type ChallengeRuleView = z.infer<typeof challengeRuleSchema>;
export type LeagueView = z.infer<typeof leagueSchema>;
export type LeagueEntryView = z.infer<typeof leagueEntrySchema>;
export type ChallengesView = z.infer<typeof challengesSchema>;
export type WrappedView = z.infer<typeof wrappedSchema>;

export type CreateFollowInput = CreateFollowBody & { userId: string };
export type RemoveFollowInput = { userId: string; id: string };
export type FeedInput = { userId: string; days?: number };
export type LeagueInput = z.infer<typeof leagueQuerySchema> & { userId: string };
export type LeagueScopeInput = { userId: string; metric: LeagueMetric; window: WeekWindow };
export type LeagueStatsInput = { accountIds: bigint[]; start: Date; end: Date; withMarks: boolean };
export type CloseLeagueWeekInput = { weekStart: Date; now: Date };
export type LeagueRollover = { closed: number; placed: number };
export type WrappedInput = { accountId: number; year?: number };

export type SnapshotWindow = {
  accountIds: readonly bigint[];
  since: Date;
  until: Date;
};

export type SignatureData = {
  nickname: string;
  clanTag: string | null;
  battles: number | null;
  winRate: number | null;
  wn8: number | null;
  avgDamage: number | null;
};

export type FollowCircle = {
  accountIds: bigint[];
  own: Set<bigint>;
};

export type WeekStatsInput = {
  accountIds: bigint[];
  start: Date;
  end: Date;
};

export type EvaluateChallengesInput = WeekWindow & {
  accountIds: bigint[];
  now: Date;
};

export type ChallengeResult = {
  accountId: bigint;
  definition: ChallengeDefinition;
  progress: number;
  isNewlyCompleted: boolean;
};

export type ChallengeBadgeContext = z.infer<typeof challengeBadgeContextSchema>;

export type AwardBadgesInput = {
  completions: readonly ChallengeResult[];
  weekStart: Date;
};
