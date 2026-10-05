import { PermissionFlagsBits } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { canManageGuild } from '../member-permissions';

describe('canManageGuild', () => {
  it('lets a member with the Manage Server permission bind the server', () => {
    expect(canManageGuild(String(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.SendMessages))).toBe(true);
  });

  it('lets an administrator bind the server', () => {
    expect(canManageGuild(String(PermissionFlagsBits.Administrator))).toBe(true);
  });

  it('refuses a member without either permission', () => {
    expect(canManageGuild(String(PermissionFlagsBits.SendMessages | PermissionFlagsBits.ManageMessages))).toBe(false);
  });

  it('refuses when Discord sent no permissions at all', () => {
    expect(canManageGuild(undefined)).toBe(false);
  });

  it('refuses a malformed permission field instead of throwing', () => {
    expect(canManageGuild('not-a-number')).toBe(false);
  });
});
