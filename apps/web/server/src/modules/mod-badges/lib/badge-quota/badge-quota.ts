import { unique } from 'remeda';

import type { QuotaKeyInput, QuotaMembersInput } from './badge-quota.types';

import { hmacSha256Hex, moscowDay } from '../../../../common/lib';
import { MOD_BADGES_QUOTA } from '../../config/mod-badges.constants';

export const quotaKey = ({ prefix, subject, now }: QuotaKeyInput): string => `${prefix}${subject}:${moscowDay(now)}`;

export const quotaMembers = ({ accountIds, secret, now }: QuotaMembersInput): string[] => {
  const day = moscowDay(now);
  const hashed = (accountId: number) => hmacSha256Hex({ key: secret, data: `${day}:${accountId}` });
  const member = (accountId: number) => hashed(accountId).slice(0, MOD_BADGES_QUOTA.memberHexLength);

  return unique(accountIds).map(member);
};
