import { MOD_BADGES_API } from './mod-badges.constants';

export const MOD_BADGE_PRESENCE = {
  value: '1',
  ttlSeconds: MOD_BADGES_API.activeDays * 24 * 60 * 60,
  ipSubjectPrefix: 'ip:',
  ipv6SubnetPrefixes: [56, 48]
} as const;
