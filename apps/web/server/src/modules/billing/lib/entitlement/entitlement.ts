import { addDays, subDays } from 'date-fns';
import { isIncludedIn } from 'remeda';

import type { Prisma } from '../../../../../generated';
import type { AccessEndInput, IsEntitledInput } from './entitlement.types';

import { PLUS_SUBSCRIPTION } from './entitlement.constants';

export const accessEndsAt = ({ status, currentPeriodEnd }: AccessEndInput): Date | null => {
  if (currentPeriodEnd === null) {
    return null;
  }

  return status === 'pastDue' ? addDays(currentPeriodEnd, PLUS_SUBSCRIPTION.pastDueGraceDays) : currentPeriodEnd;
};

export const isEntitled = ({ subscription, now }: IsEntitledInput): boolean => {
  if (subscription === null || !isIncludedIn(subscription.status, PLUS_SUBSCRIPTION.entitledStatuses)) {
    return false;
  }

  const end = accessEndsAt(subscription);

  return end !== null && end > now;
};

export const entitledSubscriptionWhere = (now: Date): Prisma.SubscriptionWhereInput => ({
  product: PLUS_SUBSCRIPTION.product,
  OR: [
    { status: { in: [...PLUS_SUBSCRIPTION.runningStatuses] }, currentPeriodEnd: { gt: now } },
    { status: 'pastDue', currentPeriodEnd: { gt: subDays(now, PLUS_SUBSCRIPTION.pastDueGraceDays) } }
  ]
});
