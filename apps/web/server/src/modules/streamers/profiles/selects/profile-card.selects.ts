import type { Prisma } from '../../../../../generated';

export const PROFILE_CARD_INCLUDE = {
  channels: { orderBy: { createdAt: 'asc' } }
} as const satisfies Prisma.StreamerProfileInclude;
