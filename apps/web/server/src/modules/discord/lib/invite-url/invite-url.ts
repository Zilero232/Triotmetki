import { PermissionFlagsBits } from 'discord-api-types/v10';

import { DISCORD } from '../../config/discord.constants';

export const inviteUrl = (applicationId: string): string => {
  const url = new URL(DISCORD.inviteUrl);
  const permissions =
    PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.EmbedLinks | PermissionFlagsBits.ManageRoles;

  url.searchParams.set('client_id', applicationId);
  url.searchParams.set('scope', DISCORD.inviteScopes.join(' '));
  url.searchParams.set('permissions', String(permissions));

  return url.href;
};
