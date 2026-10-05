import type { Prisma } from '../../../../../../generated';

export const TANK_TOTALS_SELECT = {
  tankId: true,
  capturedAt: true,
  battles: true,
  wins: true,
  losses: true,
  damageDealt: true,
  damageReceived: true,
  frags: true,
  spotted: true,
  xp: true,
  survived: true,
  hits: true,
  shots: true,
  capturePoints: true,
  droppedCapturePoints: true
} as const satisfies Prisma.TankSnapshotSelect & Prisma.TankSnapshotLatestSelect;
