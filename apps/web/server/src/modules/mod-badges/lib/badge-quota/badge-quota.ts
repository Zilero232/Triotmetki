import { addDays, differenceInSeconds } from 'date-fns';

import type { QuotaKeyInput, QuotaMembersInput } from './badge-quota.types';

import { hmacSha256Hex, moscowDay, moscowDayStart } from '../../../../common/lib';
import { MOD_BADGES_QUOTA } from '../../config/mod-badges.constants';

export const quotaKey = ({ subject, now }: QuotaKeyInput): string => `${MOD_BADGES_QUOTA.keyPrefix}${subject}:${moscowDay(now)}`;

export const quotaMembers = ({ accountIds, secret, now }: QuotaMembersInput): string[] => {
  const day = moscowDay(now);

  return accountIds.map((accountId) => hmacSha256Hex({ key: secret, data: `${day}:${accountId}` }).slice(0, MOD_BADGES_QUOTA.memberHexLength));
};

export const secondsUntilNextDay = (now: Date): number => Math.max(1, differenceInSeconds(moscowDayStart(addDays(now, 1)), now));
