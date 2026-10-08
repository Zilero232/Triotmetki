import { MOD_PRESENCE } from './mod-presence.constants';

export const modPresenceKey = (accountId: bigint | number): string => `${MOD_PRESENCE.keyPrefix}${accountId}`;
