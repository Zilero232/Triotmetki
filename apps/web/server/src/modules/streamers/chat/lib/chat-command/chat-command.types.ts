import type { CHAT_COMMANDS } from '../../config/chat.constants';

export type ChatCommand = (typeof CHAT_COMMANDS)[number];
