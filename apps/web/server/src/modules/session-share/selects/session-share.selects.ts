import type { Prisma } from '../../../../generated';

import { AUTH_PROVIDER } from '../../../lib/auth';

export const SESSION_CARD_SELECT = {
  id: true,
  accountId: true,
  battles: true,
  wins: true,
  damageDealt: true,
  wn8: true,
  player: { select: { nickname: true } }
} as const satisfies Prisma.PlaySessionSelect;

export const SHARE_RECIPIENT_SELECT = {
  locale: true,
  telegramAccount: { select: { telegramId: true } },
  accounts: { where: { providerId: AUTH_PROVIDER.discord }, select: { accountId: true }, take: 1 }
} as const satisfies Prisma.UserSelect;

export type SessionCardRow = Prisma.PlaySessionGetPayload<{ select: typeof SESSION_CARD_SELECT }>;
export type ShareRecipientRow = Prisma.UserGetPayload<{ select: typeof SHARE_RECIPIENT_SELECT }>;
