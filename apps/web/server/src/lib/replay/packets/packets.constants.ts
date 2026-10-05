export const PACKET_TYPE = {
  basePlayerCreate: 0x00,
  entityCreate: 0x05,
  entityProperty: 0x07,
  entityMethod: 0x08,
  position: 10,
  battlePeriod: 0x16,
  gameVersion: 0x18,
  chat: 0x23,
  endOfStream: 2 ** 32 - 1
} as const;

export const PACKET_FRAME = {
  headerSize: 12,
  maxPayloadSize: 4 * 1024 * 1024
} as const;

export const BATTLE_PERIOD = {
  waiting: 1,
  prebattle: 2,
  battle: 3,
  afterBattle: 4
} as const;

export const PACKET_SUPPORT = {
  minVersion: [0, 9, 14, 0],
  wgVerifiedUntil: [1, 26, 1, 1]
} as const;

export const WG_VEHICLE_METHOD_IDS = [
  { since: [0, 9, 12, 0], ids: { showShooting: 0, onHealthChanged: 1, showDamageFromShot: 7 } },
  { since: [1, 6, 0, 0], ids: { showShooting: 1, onHealthChanged: 3, showDamageFromShot: 9 } },
  { since: [1, 6, 1, 0], ids: { showShooting: 0, onHealthChanged: 1, showDamageFromShot: 7 } },
  { since: [1, 9, 0, 0], ids: { showShooting: 1, onHealthChanged: 2, showDamageFromShot: 8 } },
  { since: [1, 9, 1, 0], ids: { showShooting: 0, onHealthChanged: 1, showDamageFromShot: 7 } },
  { since: [1, 11, 1, 0], ids: { showShooting: 0, onHealthChanged: 2, showDamageFromShot: 7 } },
  { since: [1, 14, 0, 0], ids: { showShooting: 0, onHealthChanged: 2, showDamageFromShot: 8 } },
  { since: [1, 14, 1, 0], ids: { showShooting: 0, onHealthChanged: 3, showDamageFromShot: 9 } },
  { since: [1, 15, 0, 0], ids: { showShooting: 0, onHealthChanged: 2, showDamageFromShot: 8 } },
  { since: [1, 18, 0, 0], ids: { showShooting: 0, onHealthChanged: 2, showDamageFromShot: 9 } },
  { since: [1, 19, 0, 2], ids: { showShooting: 1, onHealthChanged: 3, showDamageFromShot: 10 } },
  { since: [1, 26, 1, 0], ids: { showShooting: 1, onHealthChanged: 4, showDamageFromShot: 10 } }
] as const;
