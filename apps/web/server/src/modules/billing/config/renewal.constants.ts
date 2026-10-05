import { PLUS_SUBSCRIPTION } from '../lib/entitlement/entitlement.constants';
import { BILLING_QUEUE } from './queue.constants';

export const RENEWAL = {
  leadHours: 24,
  batchSize: 100,
  pastDueGraceDays: PLUS_SUBSCRIPTION.pastDueGraceDays
} as const;

export const BILLING_SCHEDULES = [
  { id: 'billing-renewals', queue: BILLING_QUEUE.name, name: BILLING_QUEUE.jobs.renew, repeat: { pattern: '15 * * * *' } },
  { id: 'billing-expiry', queue: BILLING_QUEUE.name, name: BILLING_QUEUE.jobs.expire, repeat: { pattern: '*/10 * * * *' } }
] as const;
