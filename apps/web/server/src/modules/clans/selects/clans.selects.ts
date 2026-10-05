import type { Prisma } from '../../../../generated';

import { CLAN_PAGE } from '../config/clan-page.constants';

export const CLAN_MEMBER_INCLUDE = {
  player: {
    select: {
      nickname: true,
      lastBattleAt: true,
      ratings: { where: { period: { in: ['overall', CLAN_PAGE.recentPeriod] } } }
    }
  }
} as const satisfies Prisma.ClanMemberInclude;

export type ClanMemberRow = Prisma.ClanMemberGetPayload<{ include: typeof CLAN_MEMBER_INCLUDE }>;

export const CLAN_STRONGHOLD_SELECT = {
  strongholdLevel: true,
  stronghold: true,
  strongholdUpdatedAt: true
} as const satisfies Prisma.ClanSelect;

export type StoredStronghold = Prisma.ClanGetPayload<{ select: typeof CLAN_STRONGHOLD_SELECT }>;
