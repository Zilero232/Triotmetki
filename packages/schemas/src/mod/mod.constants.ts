export const MOD_LOADOUT = {
  optionalDevices: 4,
  consumables: 4,
  directives: 3,
  shells: 4,
  shellCount: 1_000,
  fieldModifications: 32,
  crewMembers: 8,
  skillsPerMember: 12,
  gameplayId: 1_023
} as const;

export const MOD_ERROR_CODES = [
  'account_mismatch',
  'bad_signature',
  'channel_not_linked',
  'code_expired',
  'code_not_found',
  'code_used',
  'device_revoked',
  'invalid_code',
  'invalid_payload',
  'rate_limited',
  'replay_not_owned',
  'replayed_request',
  'server_error',
  'session_not_found',
  'stale_request',
  'too_large',
  'unknown_device'
] as const;

export const MOD_RATINGS = {
  maxTanks: 100,
  deviceIdPattern: /^[\w-]+$/,
  deviceIdMaxLength: 64
} as const;

export const MOD_HANGAR = {
  maxGoals: 20,
  maxReplayIds: 20,
  shareChannels: ['telegram', 'discord'],
  shareSessionIdPattern: /^[\da-f]{32}$/
} as const;

export const MOD_AGGREGATES = {
  minAccounts: 10
} as const;

export const MOD_BADGES = {
  maxAccountIds: 100
} as const;
