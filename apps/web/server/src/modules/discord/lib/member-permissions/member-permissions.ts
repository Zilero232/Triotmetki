import { PermissionFlagsBits } from 'discord-api-types/v10';

const GUILD_MANAGERS = PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator;

export const canManageGuild = (permissions: string | undefined): boolean => {
  if (permissions === undefined || !/^\d+$/u.test(permissions)) {
    return false;
  }

  return (BigInt(permissions) & GUILD_MANAGERS) !== 0n;
};
