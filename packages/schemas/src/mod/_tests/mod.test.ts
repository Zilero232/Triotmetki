import { describe, expect, it } from 'vitest';

import { MOD_BADGES, MOD_HANGAR, MOD_RATINGS } from '../mod.constants';
import {
  modBadgePreferenceSchema,
  modBadgesRequestSchema,
  modRatingsRequestSchema,
  modReplayStatusRequestSchema,
  modSessionSharePreferenceSchema,
  modSessionShareSendSchema,
  modTankRatingsRequestSchema
} from '../mod.schemas';

const device = { device_id: 'dev_Q2xhdWRlQm9uZA', account_id: 12_345 };

describe('modRatingsRequestSchema', () => {
  it('accepts the device id format the bind endpoint issues', () => {
    expect(modRatingsRequestSchema.safeParse(device).success).toBe(true);
  });

  it('refuses a body carrying anything beyond the device and its account', () => {
    expect(modRatingsRequestSchema.safeParse({ ...device, other_account_id: 1 }).success).toBe(false);
  });

  it('refuses a device id with characters outside the issued alphabet', () => {
    expect(modRatingsRequestSchema.safeParse({ ...device, device_id: 'dev/../x' }).success).toBe(false);
  });
});

describe('modTankRatingsRequestSchema', () => {
  const ids = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

  it('accepts up to the tank limit', () => {
    expect(modTankRatingsRequestSchema.safeParse({ ...device, tank_ids: ids(MOD_RATINGS.maxTanks) }).success).toBe(true);
  });

  it('refuses an empty list and one past the limit', () => {
    expect(modTankRatingsRequestSchema.safeParse({ ...device, tank_ids: [] }).success).toBe(false);
    expect(modTankRatingsRequestSchema.safeParse({ ...device, tank_ids: ids(MOD_RATINGS.maxTanks + 1) }).success).toBe(false);
  });
});

describe('modReplayStatusRequestSchema', () => {
  const uuid = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  const ids = (count: number) => Array.from({ length: count }, (_, index) => uuid(index));

  it('accepts up to the id limit', () => {
    expect(modReplayStatusRequestSchema.safeParse({ ...device, replay_ids: ids(MOD_HANGAR.maxReplayIds) }).success).toBe(true);
  });

  it('refuses an empty list, one past the limit and ids that are not uuids', () => {
    expect(modReplayStatusRequestSchema.safeParse({ ...device, replay_ids: [] }).success).toBe(false);
    expect(modReplayStatusRequestSchema.safeParse({ ...device, replay_ids: ids(MOD_HANGAR.maxReplayIds + 1) }).success).toBe(false);
    expect(modReplayStatusRequestSchema.safeParse({ ...device, replay_ids: ['42'] }).success).toBe(false);
  });
});

describe('modSessionSharePreferenceSchema', () => {
  it('accepts every share channel once', () => {
    expect(modSessionSharePreferenceSchema.safeParse({ ...device, enabled: true, channels: [...MOD_HANGAR.shareChannels] }).success).toBe(true);
  });

  it('refuses no channel, a repeated channel and an unknown one', () => {
    expect(modSessionSharePreferenceSchema.safeParse({ ...device, enabled: false, channels: [] }).success).toBe(false);
    expect(modSessionSharePreferenceSchema.safeParse({ ...device, enabled: true, channels: ['telegram', 'telegram'] }).success).toBe(false);
    expect(modSessionSharePreferenceSchema.safeParse({ ...device, enabled: true, channels: ['vk'] }).success).toBe(false);
  });
});

describe('modSessionShareSendSchema', () => {
  const send = { ...device, channels: ['discord'] };

  it('accepts the 32-hex session id the mod issues', () => {
    expect(modSessionShareSendSchema.safeParse({ ...send, session_id: '0123456789abcdef0123456789abcdef' }).success).toBe(true);
  });

  it('refuses any other session id', () => {
    expect(modSessionShareSendSchema.safeParse({ ...send, session_id: '0123456789ABCDEF0123456789ABCDEF' }).success).toBe(false);
    expect(modSessionShareSendSchema.safeParse({ ...send, session_id: '0123' }).success).toBe(false);
  });
});

describe('modBadgesRequestSchema', () => {
  const ids = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

  it('accepts up to the arena limit of account ids', () => {
    expect(modBadgesRequestSchema.safeParse({ ...device, account_ids: ids(MOD_BADGES.maxAccountIds) }).success).toBe(true);
  });

  it('refuses an empty list, one past the limit, a repeated id and a bot id', () => {
    expect(modBadgesRequestSchema.safeParse({ ...device, account_ids: [] }).success).toBe(false);
    expect(modBadgesRequestSchema.safeParse({ ...device, account_ids: ids(MOD_BADGES.maxAccountIds + 1) }).success).toBe(false);
    expect(modBadgesRequestSchema.safeParse({ ...device, account_ids: [7, 7] }).success).toBe(false);
    expect(modBadgesRequestSchema.safeParse({ ...device, account_ids: [0] }).success).toBe(false);
  });

  it('refuses anything beyond the account ids', () => {
    expect(modBadgesRequestSchema.safeParse({ ...device, account_ids: [7], vehicles: [1] }).success).toBe(false);
  });
});

describe('modBadgePreferenceSchema', () => {
  it('accepts the switch and nothing else', () => {
    expect(modBadgePreferenceSchema.safeParse({ ...device, visible: false }).success).toBe(true);
    expect(modBadgePreferenceSchema.safeParse({ ...device, visible: 'yes' }).success).toBe(false);
    expect(modBadgePreferenceSchema.safeParse({ ...device, visible: true, nickname: 'x' }).success).toBe(false);
  });
});
