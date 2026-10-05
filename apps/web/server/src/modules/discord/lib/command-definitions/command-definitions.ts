import type { ApplicationCommandOptionAllowedChannelType, RESTPutAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

import { ApplicationCommandOptionType, ChannelType, InteractionContextType, PermissionFlagsBits } from 'discord-api-types/v10';

import type { CommandDefinitionsInput } from './command-definitions.types';

import { DISCORD_OPTIONS } from '../../config/commands.constants';

export const commandDefinitions = ({ describe }: CommandDefinitionsInput): RESTPutAPIApplicationCommandsJSONBody => {
  const textChannels: ApplicationCommandOptionAllowedChannelType[] = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

  return [
    {
      name: 'stats',
      ...describe('cmd-stats'),
      options: [{ type: ApplicationCommandOptionType.String, name: DISCORD_OPTIONS.nickname, ...describe('opt-nickname'), required: false }]
    },
    { name: 'session', ...describe('cmd-session') },
    { name: 'marks', ...describe('cmd-marks') },
    { name: 'clan', ...describe('cmd-clan') },
    {
      name: 'tank',
      ...describe('cmd-tank'),
      options: [{ type: ApplicationCommandOptionType.String, name: DISCORD_OPTIONS.name, ...describe('opt-name'), required: true }]
    },
    { name: 'top', ...describe('cmd-top') },
    {
      name: 'setup',
      ...describe('cmd-setup'),
      contexts: [InteractionContextType.Guild],
      default_member_permissions: String(PermissionFlagsBits.ManageGuild),
      options: [
        {
          type: ApplicationCommandOptionType.Channel,
          name: DISCORD_OPTIONS.channel,
          ...describe('opt-channel'),
          required: true,
          channel_types: textChannels
        },
        { type: ApplicationCommandOptionType.Role, name: DISCORD_OPTIONS.memberRole, ...describe('opt-member-role'), required: false },
        { type: ApplicationCommandOptionType.Boolean, name: DISCORD_OPTIONS.tierRoles, ...describe('opt-tier-roles'), required: false },
        {
          type: ApplicationCommandOptionType.Channel,
          name: DISCORD_OPTIONS.reportChannel,
          ...describe('opt-report-channel'),
          required: false,
          channel_types: textChannels
        }
      ]
    },
    { name: 'roles', ...describe('cmd-roles'), contexts: [InteractionContextType.Guild] },
    { name: 'help', ...describe('cmd-help') }
  ];
};
