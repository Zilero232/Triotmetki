import type { VK_COMMAND_ALIASES } from '../../config/commands.constants';

type VkCommand = keyof typeof VK_COMMAND_ALIASES;

export type ParsedVkCommand = {
  command: VkCommand;
  argument: string;
};
