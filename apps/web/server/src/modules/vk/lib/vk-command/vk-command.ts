import { entries, isIncludedIn } from 'remeda';

import type { ParsedVkCommand } from './vk-command.types';

import { VK_COMMAND_ALIASES, VK_COMMAND_PATTERN } from '../../config/commands.constants';

export const parseVkCommand = (raw: string): ParsedVkCommand | null => {
  const text = raw.trim().replace(VK_COMMAND_PATTERN.mention, '').replace(VK_COMMAND_PATTERN.prefix, '');
  const [head = '', ...rest] = text.split(/\s+/u);
  const word = head.toLowerCase();
  const match = entries(VK_COMMAND_ALIASES).find(([, aliases]) => isIncludedIn(word, aliases));

  return match ? { command: match[0], argument: rest.join(' ').trim() } : null;
};
