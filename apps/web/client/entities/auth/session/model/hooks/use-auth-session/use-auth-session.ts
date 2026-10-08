'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/constants';
import { useHydrated } from '@/shared/lib';

import type { AuthSessionQuery } from './use-auth-session.types';

import { getAuthSession, signOut } from '../../../api';
import { AUTH_SESSION } from '../../../config';
import { useResetUserQueries } from '../use-reset-user-queries';

export const useAuthSession = (): AuthSessionQuery => {
  const isHydrated = useHydrated();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.auth.session,
    queryFn: getAuthSession,
    staleTime: AUTH_SESSION.staleMs,
    retry: false,
    retryOnMount: false
  });

  return {
    data: isHydrated ? data : undefined,
    error: isHydrated ? error : null,
    isPending: !isHydrated || isPending,
    isFetching: isHydrated && isFetching,
    refetch
  };
};

export const useSignOut = () => {
  const queryClient = useQueryClient();
  const resetUserQueries = useResetUserQueries();

  return useMutation({
    mutationFn: signOut,
    meta: { errorKey: 'me.toast.signOutFailed' },
    onSuccess: () => {
      queryClient.setQueryData(QUERY_KEYS.auth.session, null);
      resetUserQueries();
    }
  });
};
