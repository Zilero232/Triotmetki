import type { Prisma } from '../../../../generated';

export const USER_LESTA_ACCOUNT_ORDER = [
  { isPrimary: 'desc' },
  { linkedAt: 'asc' }
] as const satisfies Prisma.UserLestaAccountOrderByWithRelationInput[];
