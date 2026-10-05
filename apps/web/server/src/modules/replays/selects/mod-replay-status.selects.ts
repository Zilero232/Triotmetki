import type { Prisma } from '../../../../generated';

export const MOD_REPLAY_STATUS_SELECT = {
  id: true,
  status: true,
  damageDealt: true,
  summary: true
} as const satisfies Prisma.ReplaySelect;
