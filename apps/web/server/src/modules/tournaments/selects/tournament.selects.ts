import type { Prisma } from '../../../../generated';

export const TOURNAMENT_INCLUDE = {
  participants: { orderBy: [{ createdAt: 'asc' }, { accountId: 'asc' }] }
} satisfies Prisma.TournamentInclude;
