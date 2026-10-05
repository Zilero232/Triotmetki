import type { API } from '@discordjs/core';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';

import type { DiscordGuild } from '../../../generated';
import type { BotLocale, LinkedBotUser } from '../bot-commands';
import type { MemberStanding } from './lib/member-roles/member-roles.types';
import type { NotificationMessageInput } from './mappers/messages.types';

export type CommandContext = {
  interaction: APIChatInputApplicationCommandInteraction;
  locale: BotLocale;
  linked: LinkedBotUser | null;
  discordUserId: string;
};

export type DiscordTextInput = {
  locale: BotLocale;
  key: string;
  vars?: Record<string, number | string>;
};

export type SyncMemberInput = {
  guild: DiscordGuild;
  discordUserId: string;
  withTiers: boolean;
};

export type ApplyRolesInput = SyncMemberInput & {
  standing: MemberStanding | null;
};

export type SyncGuildInput = {
  guild: DiscordGuild & { members: { discordUserId: string }[] };
};

export type EnsureTierRolesInput = {
  guildId: string;
  locale: BotLocale;
  current: unknown;
};

export type RecordSeenInput = {
  guildId: string;
  discordUserId: string;
};

export type RegisterCommandsInput = {
  api: API;
  applicationId: string;
};

export type SendDirectInput = NotificationMessageInput & {
  discordUserId: string;
};
