import { describe, expect, it } from 'vitest';

import { CHAT_COMMANDS } from '../../../config/chat.constants';
import { parseChatCommand } from '../chat-command';

describe('parseChatCommand', () => {
  it.each(CHAT_COMMANDS)('recognises !%s in any case and with arguments', (command) => {
    expect(parseChatCommand(`!${command.toUpperCase()} please`)).toBe(command);
  });

  it('ignores ordinary chat and unknown commands', () => {
    expect(parseChatCommand('stat')).toBeNull();
    expect(parseChatCommand('!unknown')).toBeNull();
    expect(parseChatCommand('')).toBeNull();
  });
});
