import type { DeletionSource, DeletionStatus, TrackingTier } from '../../../../generated';

export const ACHIEVEMENTS_FETCH = {
  batch: 1000,
  fields: ['achievements', 'max_series'],
  refreshDays: 7,
  tiers: ['active', 'population'] satisfies TrackingTier[],
  blockingSources: ['user', 'lesta'] satisfies DeletionSource[],
  blockingStatuses: ['pending', 'processing', 'completed', 'failed'] satisfies DeletionStatus[]
} as const;
