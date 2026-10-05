import type { Prisma } from '../../../../generated';

export const LATEST_SESSION_SELECT = {
  kind: true,
  source: true,
  status: true,
  startedAt: true,
  endedAt: true,
  battles: true,
  wins: true,
  damageDealt: true,
  wn8: true,
  broneIndex: true
} as const satisfies Prisma.PlaySessionSelect;

export const LATEST_SESSION_ORDER = { startedAt: 'desc' } as const satisfies Prisma.PlaySessionOrderByWithRelationInput;

export const OVERALL_RATING_SELECT = {
  battles: true,
  winRate: true,
  avgDamage: true,
  wn8: true,
  eff: true,
  broneIndex: true,
  computedAt: true,
  player: { select: { nickname: true } }
} as const satisfies Prisma.AccountRatingSelect;

export const OWN_TANK_SELECT = {
  tankId: true,
  battles: true,
  wins: true,
  markOfMastery: true,
  marksOnGun: true,
  moePercent: true
} as const satisfies Prisma.PlayerTankSelect;

export const TANK_RATING_SELECT = {
  tankId: true,
  battles: true,
  winRate: true,
  avgDamage: true,
  wn8: true
} as const satisfies Prisma.AccountTankRatingSelect;

export const TANK_TOTALS_SELECT = {
  tankId: true,
  battles: true,
  wins: true,
  damageDealt: true,
  markOfMastery: true,
  marksOnGun: true,
  maxFrags: true,
  maxXp: true
} as const satisfies Prisma.TankSnapshotLatestSelect;

export type LatestSessionRow = Prisma.PlaySessionGetPayload<{ select: typeof LATEST_SESSION_SELECT }>;
export type OverallRatingRow = Prisma.AccountRatingGetPayload<{ select: typeof OVERALL_RATING_SELECT }>;
export type OwnTankRow = Prisma.PlayerTankGetPayload<{ select: typeof OWN_TANK_SELECT }>;
export type TankRatingRow = Prisma.AccountTankRatingGetPayload<{ select: typeof TANK_RATING_SELECT }>;
export type TankTotalsRow = Prisma.TankSnapshotLatestGetPayload<{ select: typeof TANK_TOTALS_SELECT }>;
