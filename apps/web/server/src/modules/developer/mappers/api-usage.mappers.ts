import type { ApiErrorLogEntry } from '@otmetki/schemas';

import type { ApiErrorLog, ApiUsageDaily } from '../../../../generated';
import type { UsageRow } from '../lib/usage/usage.types';

import { isoDay } from '../../../common/lib';

export const toUsageRow = (row: ApiUsageDaily): UsageRow => ({
  day: isoDay(row.day),
  endpoint: row.endpoint,
  requests: row.requests,
  errors: row.errors,
  throttled: row.throttled,
  latencyMsTotal: Number(row.latencyMsTotal)
});

export const toApiErrorLogEntry = (row: ApiErrorLog): ApiErrorLogEntry => ({
  id: row.id,
  method: row.method,
  path: row.path,
  status: row.status,
  code: row.code,
  message: row.message,
  occurredAt: row.occurredAt.toISOString()
});
