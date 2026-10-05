import type { BotUserRow } from '../selects/bot-user.types';

export type ToLinkedBotUserInput = {
  userId: string;
  user: BotUserRow;
  languageHint?: string | null;
};
