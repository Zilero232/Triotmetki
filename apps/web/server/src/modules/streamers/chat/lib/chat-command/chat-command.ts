import type { ChatCommand } from './chat-command.types';

import { CHAT_COMMANDS } from '../../config/chat.constants';

export const parseChatCommand = (text: string): ChatCommand | null => {
  const [head] = text.trim().toLowerCase().split(/\s+/u);

  if (!head?.startsWith('!')) {
    return null;
  }

  return CHAT_COMMANDS.find((command) => command === head.slice(1)) ?? null;
};
