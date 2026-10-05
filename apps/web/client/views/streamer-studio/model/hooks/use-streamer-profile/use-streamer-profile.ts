'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/shared/constants';

import { findMyStreamerProfile, saveStreamerProfile } from '../../../api';

export const useStreamerProfile = () => useQuery({ queryKey: QUERY_KEYS.me.streamer.profile, queryFn: findMyStreamerProfile });

export const useSaveStreamerProfile = () => {
  const t = useTranslations('streamer.studio.toast');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveStreamerProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEYS.me.streamer.profile, profile);
      toast.success(t('saved'));
    }
  });
};
