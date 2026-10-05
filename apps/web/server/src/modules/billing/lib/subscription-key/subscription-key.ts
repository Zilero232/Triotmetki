import type { Prisma } from '../../../../../generated';

import { PLUS_SUBSCRIPTION } from '../entitlement/entitlement.constants';

export const plusSubscriptionKey = (userId: string): Prisma.SubscriptionWhereUniqueInput => ({
  userId_product: { userId, product: PLUS_SUBSCRIPTION.product }
});
