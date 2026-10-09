'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useResetUserQueries } from '@/entities/auth/session';
import { QUERY_KEYS } from '@/shared/constants';

import type { UseMiniAppSignInInput } from './use-mini-app-sign-in.types';

import { signInWithMiniApp, signInWithVkMiniApp } from '../../../api';

export const useMiniAppSignIn = ({ launch, platform }: UseMiniAppSignInInput) => {
  const queryClient = useQueryClient();
  const resetUserQueries = useResetUserQueries();
  const signIn = useMutation({
    mutationFn: platform === 'vk' ? signInWithVkMiniApp : signInWithMiniApp,
    onSuccess: async () => {
      resetUserQueries();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.session });
    }
  });

  const { mutate } = signIn;
  const startedRef = useRef(false);

  useEffect(() => {
    if (launch.env !== 'inside' || startedRef.current) {
      return;
    }

    startedRef.current = true;
    mutate(launch.payload ?? '');
  }, [launch.env, launch.payload, mutate]);

  return signIn;
};
