import type { Prisma } from '../../../../../generated';

export const DAY_SESSION_DELTA_SELECT = {
  tankId: true,
  capturedAt: true,
  battles: true,
  wins: true,
  damageDealt: true,
  damageBlocked: true,
  frags: true,
  spotted: true,
  xp: true,
  survived: true,
  capturePoints: true,
  droppedCapturePoints: true
} as const satisfies Prisma.TankBattleDeltaSelect;
