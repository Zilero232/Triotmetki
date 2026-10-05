import type { ChatTextInput } from './chat-copy.types';

import { createFluentStore } from '../../../../bot-commands';
import { CHAT_COPY } from '../../config/chat.constants';

const store = createFluentStore({ files: CHAT_COPY.files });

export const chatText = ({ locale, message, values }: ChatTextInput): string => store.t(locale, message, values);

export const chatValue = (value: number | null | undefined): number | string =>
  value === null || value === undefined || !Number.isFinite(value) ? CHAT_COPY.missing : value;
