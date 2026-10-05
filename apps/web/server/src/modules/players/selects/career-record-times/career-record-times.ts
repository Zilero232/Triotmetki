import type { Prisma } from '../../../../../generated';

export const CAREER_RECORD_TIMES_SELECT = {
  maxDamage: true,
  maxDamageAt: true,
  maxXp: true,
  maxXpAt: true,
  maxFrags: true,
  maxFragsAt: true
} as const satisfies Prisma.AccountModeStatsSelect;
