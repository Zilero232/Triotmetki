import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';

import type { BindAttemptCounter, BindAttemptsInput } from './bind-attempts.types';

import { BIND_CODE } from '../../config/bind-code.constants';

export const bindAttemptCounters = ({ requester, accountId }: BindAttemptsInput): BindAttemptCounter[] => {
  const network = normalizeIp(requester, DEFAULT_IPV6_SUBNET_PREFIX);
  const requesterCounter = {
    key: `${BIND_CODE.failurePrefix}${network}:${accountId ?? BIND_CODE.anyAccount}`,
    limit: BIND_CODE.maxFailuresPerRequester
  };

  if (accountId === undefined) {
    return [requesterCounter];
  }

  return [requesterCounter, { key: `${BIND_CODE.accountFailurePrefix}${accountId}`, limit: BIND_CODE.maxFailuresPerAccount }];
};
