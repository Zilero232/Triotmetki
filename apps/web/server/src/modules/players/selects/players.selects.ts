import type { Prisma } from '../../../../generated';

export const CAREER_RECORD_TIMES_SELECT = {
  maxDamage: true,
  maxDamageAt: true,
  maxXp: true,
  maxXpAt: true,
  maxFrags: true,
  maxFragsAt: true
} as const satisfies Prisma.AccountModeStatsSelect;

export type CareerRecordTimes = Prisma.AccountModeStatsGetPayload<{ select: typeof CAREER_RECORD_TIMES_SELECT }>;

export const LATEST_TANK_SNAPSHOT_SELECT = {
  tankId: true,
  battles: true,
  wins: true,
  damageDealt: true,
  frags: true,
  xp: true,
  survived: true,
  maxFrags: true,
  maxXp: true
} as const satisfies Prisma.TankSnapshotLatestSelect;

export type LatestTankSnapshot = Prisma.TankSnapshotLatestGetPayload<{ select: typeof LATEST_TANK_SNAPSHOT_SELECT }>;
