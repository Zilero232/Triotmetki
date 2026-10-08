import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';

import type { BindAttemptCounters, BindAttemptsInput } from './bind-attempts.types';

import { BIND_CODE } from '../../config/bind-code.constants';

export const bindAttemptCounters = ({ requester, accountId }: BindAttemptsInput): BindAttemptCounters => {
  const network = normalizeIp(requester, DEFAULT_IPV6_SUBNET_PREFIX);
  const requesterCounter = {
    key: `${BIND_CODE.failurePrefix}${network}:${accountId ?? BIND_CODE.anyAccount}`,
    limit: BIND_CODE.maxFailuresPerRequester
  };

  if (accountId === undefined) {
    return { requester: requesterCounter, account: null };
  }

  const accountCounter = { key: `${BIND_CODE.accountFailurePrefix}${accountId}`, limit: BIND_CODE.maxFailuresPerAccount };

  return { requester: requesterCounter, account: accountCounter };
};
