'use client';

import { useMutation } from '@tanstack/react-query';

import { getFavorites, removeFavorite } from '@/features/player/toggle-favorite';
import { QUERY_KEYS } from '@/shared/constants';

import { useMeSection } from '../use-me-section';

export const useFavoritesCard = () => {
  const query = useMeSection({ section: 'favorites', fetcher: getFavorites });
  const remove = useMutation({
    mutationFn: removeFavorite,
    meta: { successKey: 'me.toast.favoriteRemoved', errorKey: 'me.toast.failed', invalidates: [QUERY_KEYS.me.section('favorites')] }
  });

  const { isFetching, refetch } = query;

  return {
    query,
    isRetrying: isFetching,
    isRemoving: remove.isPending,
    onRetry: () => void refetch(),
    onRemove: (id: string) => remove.mutate(id)
  };
};
