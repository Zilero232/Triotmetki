import { fromUnixTime } from 'date-fns';

import type { UpsertPlayerInput } from '../poll-pipeline/poll-pipeline.types';
import type { PlayerIdentity } from './player-identity.types';

export const playerIdentity = ({ info, previous, tier, promote }: UpsertPlayerInput): PlayerIdentity => ({
  accountId: BigInt(info.account_id),
  nickname: info.nickname,
  clanId: info.clan_id === null ? null : BigInt(info.clan_id),
  createdAt: fromUnixTime(info.created_at),
  trackingTier: promote ? 'active' : (previous?.trackingTier ?? tier),
  logoutAt: info.logout_at ? fromUnixTime(info.logout_at) : null
});

export const changesClan = ({ info, previous }: UpsertPlayerInput): boolean => (previous ? previous.clanId !== info.clan_id : info.clan_id !== null);
