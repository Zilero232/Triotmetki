import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';

import type { IpQuotaSubjectInput, PresenceTrackedRequest, PresentAccountsInput } from './badge-presence.types';

import { hmacSha256Hex } from '../../../../common/lib';
import { MOD_BADGE_PRESENCE } from '../../config/badge-presence.constants';
import { MOD_BADGES_QUOTA } from '../../config/mod-badges.constants';

export const presenceTracker = ({ ip }: PresenceTrackedRequest): string => normalizeIp(ip ?? '', DEFAULT_IPV6_SUBNET_PREFIX);

export const ipQuotaSubject = ({ ip, secret }: IpQuotaSubjectInput): string =>
  `${MOD_BADGE_PRESENCE.ipSubjectPrefix}${hmacSha256Hex({ key: secret, data: presenceTracker({ ip }) }).slice(0, MOD_BADGES_QUOTA.memberHexLength)}`;

export const presentAccounts = ({ accountIds, flags, hidden }: PresentAccountsInput): number[] =>
  accountIds.filter((accountId, index) => flags[index] !== null && flags[index] !== undefined && !hidden.has(BigInt(accountId)));
