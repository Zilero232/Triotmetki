import { PLUS_GRACE } from '@otmetki/schemas';

import type { SubscriptionStatus } from '../../../../../generated';

export const PLUS_SUBSCRIPTION = {
  product: 'plus',
  entitledStatuses: ['active', 'trialing', 'pastDue'] satisfies SubscriptionStatus[],
  runningStatuses: ['active', 'trialing'] satisfies SubscriptionStatus[],
  pastDueGraceDays: PLUS_GRACE.pastDueDays
} as const;
