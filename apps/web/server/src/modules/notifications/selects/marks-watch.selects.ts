import type { Prisma } from '../../../../generated';

export const MARK_BATTLE_SELECT = {
  id: true,
  accountId: true,
  tankId: true,
  marksOnGun: true,
  startedAt: true,
  receivedAt: true
} as const satisfies Prisma.BattleSelect;

export type MarkBattleRow = Prisma.BattleGetPayload<{ select: typeof MARK_BATTLE_SELECT }>;
