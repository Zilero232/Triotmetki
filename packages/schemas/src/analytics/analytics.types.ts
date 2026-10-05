import type { z } from 'zod';

import type {
  analyticsBattlesQuerySchema,
  analyticsBreakdownSchema,
  analyticsGranularitySchema,
  analyticsMapsSchema,
  analyticsOverviewSchema,
  analyticsPeriodSchema,
  analyticsPlatoonsSchema,
  analyticsQuerySchema,
  analyticsRngSchema,
  analyticsTankQuerySchema,
  analyticsTankSchema,
  battleAnalysisSchema,
  battleMistakeSchema,
  breakdownRowSchema,
  firstWinSchema,
  firstWinTankSchema,
  hourStatSchema,
  mapClassRowSchema,
  mapStatSchema,
  myBattleSchema,
  myBattlesPageSchema,
  platoonMateSchema,
  playlistItemSchema,
  playlistQuerySchema,
  playlistReasonSchema,
  playlistSchema,
  rngBucketSchema,
  rngDistanceSchema,
  sessionCompareRowSchema,
  shotRollSchema,
  statLineSchema,
  tankReferenceSchema,
  tiltSchema,
  trendPointSchema,
  weekdayStatSchema
} from './analytics.schemas';

export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;
export type AnalyticsGranularity = z.infer<typeof analyticsGranularitySchema>;
export type PlaylistReason = z.infer<typeof playlistReasonSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type AnalyticsTankQuery = z.infer<typeof analyticsTankQuerySchema>;
export type AnalyticsBattlesQuery = z.infer<typeof analyticsBattlesQuerySchema>;
export type PlaylistQuery = z.infer<typeof playlistQuerySchema>;
export type StatLine = z.infer<typeof statLineSchema>;
export type BreakdownRow = z.infer<typeof breakdownRowSchema>;
export type AnalyticsBreakdown = z.infer<typeof analyticsBreakdownSchema>;
export type HourStat = z.infer<typeof hourStatSchema>;
export type WeekdayStat = z.infer<typeof weekdayStatSchema>;
export type TrendPoint = z.infer<typeof trendPointSchema>;
export type Tilt = z.infer<typeof tiltSchema>;
export type SessionCompareRow = z.infer<typeof sessionCompareRowSchema>;
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
export type AnalyticsTank = z.infer<typeof analyticsTankSchema>;
export type MapClassRow = z.infer<typeof mapClassRowSchema>;
export type MapStat = z.infer<typeof mapStatSchema>;
export type AnalyticsMaps = z.infer<typeof analyticsMapsSchema>;
export type PlatoonMate = z.infer<typeof platoonMateSchema>;
export type AnalyticsPlatoons = z.infer<typeof analyticsPlatoonsSchema>;
export type MyBattle = z.infer<typeof myBattleSchema>;
export type MyBattlesPage = z.infer<typeof myBattlesPageSchema>;
export type TankReference = z.infer<typeof tankReferenceSchema>;
export type BattleMistake = z.infer<typeof battleMistakeSchema>;
export type ShotRoll = z.infer<typeof shotRollSchema>;
export type BattleAnalysis = z.infer<typeof battleAnalysisSchema>;
export type RngBucket = z.infer<typeof rngBucketSchema>;
export type RngDistance = z.infer<typeof rngDistanceSchema>;
export type AnalyticsRng = z.infer<typeof analyticsRngSchema>;
export type PlaylistItem = z.infer<typeof playlistItemSchema>;
export type Playlist = z.infer<typeof playlistSchema>;
export type FirstWinTank = z.infer<typeof firstWinTankSchema>;
export type FirstWin = z.infer<typeof firstWinSchema>;
