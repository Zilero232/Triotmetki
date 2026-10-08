'use client';

import { isPlusState, PLUS_TRIAL } from '@otmetki/schemas';
import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/entities/auth/session';
import { getBillingStatus, plusLimitsFor } from '@/entities/plus/subscription';
import { QUERY_KEYS } from '@/shared/constants';

export const usePlus = () => {
  const { data: session, isPending: isSessionPending } = useAuthSession();
  const {
    data: status,
    isPending: isStatusPending,
    isError: isStatusError,
    isRefetching,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.me.billing.status,
    queryFn: getBillingStatus,
    enabled: Boolean(session)
  });

  const isSignedIn = Boolean(session);
  const plus = status?.plus ?? null;
  const isPlus = plus ? isPlusState(plus.state) : false;
  const isError = isSignedIn && isStatusError;

  return {
    isSignedIn,
    isPlus,
    state: plus?.state ?? 'none',
    periodEnd: plus?.periodEnd ?? null,
    graceEndsAt: plus?.graceEndsAt ?? null,
    trialAvailable: plus?.trialAvailable ?? false,
    trialDays: plus?.trialDays ?? PLUS_TRIAL.days,
    isCheckoutAvailable: status?.isCheckoutAvailable ?? false,
    limits: plusLimitsFor(isPlus),
    isPending: isSessionPending || (isSignedIn && isStatusPending),
    isError,
    isRefetching,
    refetch: () => void refetch()
  };
};
