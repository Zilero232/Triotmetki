import type { LinkedBotUser } from '../bot-commands.types';
import type { ToLinkedBotUserInput } from './bot-user.types';

import { resolveBotLocale } from '../lib/bot-locale/bot-locale';

export const toLinkedBotUser = ({ userId, user, languageHint }: ToLinkedBotUserInput): LinkedBotUser => {
  const [primary] = user.lestaAccounts;

  return {
    userId,
    accountId: primary?.accountId ?? null,
    nickname: primary?.player.nickname ?? null,
    locale: resolveBotLocale(user.locale || languageHint)
  };
};
