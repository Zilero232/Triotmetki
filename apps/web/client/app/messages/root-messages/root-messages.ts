import type { Locale } from '@/shared/i18n';

import { messages, pickMessages } from '@/shared/i18n';

import type { ScopedMessagesInput } from './root-messages.types';

import { ROOT_MESSAGES } from '../config';

export const rootMessages = (locale: Locale) => pickMessages({ messages: messages[locale], paths: ROOT_MESSAGES });

export const scopedMessages = ({ locale, paths }: ScopedMessagesInput) =>
  pickMessages({ messages: messages[locale], paths: [...ROOT_MESSAGES, ...paths] });
