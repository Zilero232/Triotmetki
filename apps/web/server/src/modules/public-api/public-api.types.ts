import type { ApiTier } from '@otmetki/schemas';
import type { Request } from 'express';

import type { ApiErrorLog } from '../../../generated';
import type { AuthenticatedApiKey } from '../developer';
import type { UsageCounters } from './lib/usage-counters/usage-counters.types';

export type ApiRequest = Request & {
  apiKey?: AuthenticatedApiKey;
};

export type RecordUsageInput = {
  keyId: string;
  endpoint: string;
  latencyMs: number;
  failed: boolean;
};

export type RecordThrottledInput = {
  keyId: string;
  endpoint: string;
};

export type LogErrorInput = Pick<ApiErrorLog, 'code' | 'message' | 'method' | 'path' | 'status'> & {
  keyId: string;
};

export type SecondBudget = {
  limit: number;
  remaining: number;
};

export type UserBudget = {
  second: SecondBudget;
  day: SecondBudget;
};

type LimiterWindow = 'day' | 'second';

export type LimiterInput = {
  tier: ApiTier;
  window: LimiterWindow;
};

export type AddUsageInput = {
  keyId: string;
  endpoint: string;
  counters: UsageCounters;
};

export type UsageBufferEntry = AddUsageInput & {
  day: string;
};

export type BudgetOwner = {
  userId: string;
  tier: ApiTier;
};

export type TakeBudgetInput = {
  owner: BudgetOwner;
  window: LimiterWindow;
  limit: number;
  reject: (retryAfterSec: number) => Error;
};
