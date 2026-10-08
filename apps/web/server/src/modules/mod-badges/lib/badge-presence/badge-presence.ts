import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';
import { unique } from 'remeda';

import type { IpQuotaSubjectsInput, PresenceTrackedRequest, PresentAccountsInput } from './badge-presence.types';

import { hmacSha256Hex } from '../../../../common/lib';
import { MOD_BADGE_PRESENCE } from '../../config/badge-presence.constants';
import { MOD_BADGES_QUOTA } from '../../config/mod-badges.constants';

export const presenceTracker = ({ ip }: PresenceTrackedRequest): string => normalizeIp(ip ?? '', DEFAULT_IPV6_SUBNET_PREFIX);

export const ipQuotaSubjects = ({ ip, secret }: IpQuotaSubjectsInput): string[] => {
  const address = ip ?? '';
  const networks = MOD_BADGE_PRESENCE.ipv6SubnetPrefixes.map((prefix) => normalizeIp(address, prefix));
  const digest = (network: string) => hmacSha256Hex({ key: secret, data: network }).slice(0, MOD_BADGES_QUOTA.memberHexLength);
  const subject = (network: string) => `${MOD_BADGE_PRESENCE.ipSubjectPrefix}${digest(network)}`;

  return unique(networks).map(subject);
};

export const presentAccounts = ({ accountIds, flags, hidden }: PresentAccountsInput): number[] =>
  accountIds.filter((accountId, index) => flags[index] !== null && flags[index] !== undefined && !hidden.has(BigInt(accountId)));
