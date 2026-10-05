import { MOD_REPORTS } from '@otmetki/schemas';

import type { DeletionSource, DeletionStatus } from '../../../../../generated';
import type { RetentionRule } from '../purge.types';

export const PURGE = {
  blockingSources: ['user', 'lesta'] satisfies DeletionSource[],
  blockingStatuses: ['pending', 'processing', 'completed', 'failed'] satisfies DeletionStatus[],
  claimableStatuses: ['pending', 'processing', 'failed'] satisfies DeletionStatus[],
  dispatchBatch: 50,
  failedCooldownMs: 6 * 60 * 60 * 1_000
} as const;

export const RETENTION = {
  deleteBatch: 5_000,
  rules: [
    { table: 'collector_job_metric', column: 'bucket_start', days: 14 },
    { table: 'webhook_delivery', column: 'created_at', days: 30, where: "status <> 'pending'" },
    { table: 'api_error_log', column: 'occurred_at', days: 30 },
    { table: 'mod_problem_report', column: 'created_at', days: MOD_REPORTS.retentionDays },
    { table: 'settings_apply_request', column: 'created_at', days: 90 },
    { table: 'api_usage_daily', column: 'day', days: 120 },
    { table: 'one_time_code', column: 'expires_at', days: 1 },
    { table: 'notification', column: 'created_at', days: 180 },
    {
      table: 'tank_percentile',
      column: 'date',
      days: 60,
      where:
        'date < (SELECT max(latest.date) FROM tank_percentile latest WHERE latest.tank_id = tank_percentile.tank_id AND latest.distribution = tank_percentile.distribution)'
    },
    { table: 'build_usage_aggregate', column: 'computed_at', days: 180 },
    { table: 'league_membership', column: 'week_start', days: 189 },
    { table: 'audit_log', column: 'created_at', days: 365 },
    { table: 'clan_snapshot', column: 'captured_at', days: 365 },
    { table: 'clan_member_event', column: 'occurred_at', days: 730 },
    { table: 'tank_threshold', column: 'date', days: 730 },
    { table: 'battle', column: 'received_at', days: 730 },
    { table: 'play_session', column: 'started_at', days: 730 }
  ] satisfies readonly RetentionRule[]
} as const;
