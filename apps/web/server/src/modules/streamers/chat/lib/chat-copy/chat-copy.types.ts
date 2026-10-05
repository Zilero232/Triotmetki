import type { TranslationVariables } from '@grammyjs/i18n';

import type { NotificationLocale } from '../../../../notifications';
import type { CHAT_COPY } from '../../config/chat.constants';

export type ChatMessage = (typeof CHAT_COPY.messages)[keyof typeof CHAT_COPY.messages];

export type ChatValues = TranslationVariables;

export type ChatTextInput = {
  locale: NotificationLocale;
  message: ChatMessage;
  values: ChatValues;
};
