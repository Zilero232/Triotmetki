import type { Prisma } from '../../../../../generated';

export const STORED_PLAYER_SELECT = {
  accountId: true,
  clanId: true,
  lastBattleAt: true,
  lastPolledAt: true,
  trackingTier: true
} as const satisfies Prisma.PlayerSelect;

export type StoredPlayerRow = Prisma.PlayerGetPayload<{ select: typeof STORED_PLAYER_SELECT }>;
