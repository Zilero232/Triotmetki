import type { Prisma } from '../../../../generated';

import { USER_LESTA_ACCOUNT_ORDER } from '../../accounts';

export const BOT_USER_SELECT = {
  locale: true,
  lestaAccounts: {
    orderBy: USER_LESTA_ACCOUNT_ORDER,
    take: 1,
    select: { accountId: true, player: { select: { nickname: true } } }
  }
} as const satisfies Prisma.UserSelect;
