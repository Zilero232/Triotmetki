import type { z } from 'zod';

import type {
  bindCodeInputSchema,
  bindCodeSchema,
  modBadgePreferenceAnswerSchema,
  modBadgesSchema,
  modBattleLoadoutSchema,
  modDeviceSchema,
  modErrorCodeSchema,
  modGoalSchema,
  modGoalsSchema,
  modOverallRatingsSchema,
  modOverviewSchema,
  modReplayHighlightsSchema,
  modReplayStatusesSchema,
  modReplayStatusSchema,
  modSessionRatingsSchema,
  modSessionSharePreferenceAnswerSchema,
  modSessionShareSentSchema,
  modTankExpectedSchema,
  modTankRatingSchema,
  modTankRatingsSchema,
  modTankRecordsSchema
} from './mod.schemas';

export type BindCodeInput = z.infer<typeof bindCodeInputSchema>;
export type BindCode = z.infer<typeof bindCodeSchema>;
export type ModDevice = z.infer<typeof modDeviceSchema>;
export type ModBattleLoadout = z.infer<typeof modBattleLoadoutSchema>;
export type ModErrorCode = z.infer<typeof modErrorCodeSchema>;
export type ModOverallRatings = z.infer<typeof modOverallRatingsSchema>;
export type ModSessionRatings = z.infer<typeof modSessionRatingsSchema>;
export type ModOverview = z.infer<typeof modOverviewSchema>;
export type ModTankRating = z.infer<typeof modTankRatingSchema>;
export type ModTankRatings = z.infer<typeof modTankRatingsSchema>;
export type ModTankRecords = z.infer<typeof modTankRecordsSchema>;
export type ModTankExpected = z.infer<typeof modTankExpectedSchema>;
export type ModGoal = z.infer<typeof modGoalSchema>;
export type ModGoals = z.infer<typeof modGoalsSchema>;
export type ModReplayHighlights = z.infer<typeof modReplayHighlightsSchema>;
export type ModReplayStatus = z.infer<typeof modReplayStatusSchema>;
export type ModReplayStatuses = z.infer<typeof modReplayStatusesSchema>;
export type ModSessionSharePreferenceAnswer = z.infer<typeof modSessionSharePreferenceAnswerSchema>;
export type ModSessionShareSent = z.infer<typeof modSessionShareSentSchema>;
export type ModBadges = z.infer<typeof modBadgesSchema>;
export type ModBadgePreferenceAnswer = z.infer<typeof modBadgePreferenceAnswerSchema>;
