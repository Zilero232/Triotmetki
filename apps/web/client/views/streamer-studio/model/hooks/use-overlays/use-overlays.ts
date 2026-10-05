'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/constants';

import { getOverlays, removeOverlay, saveOverlay } from '../../../api';

export const useOverlays = () => useQuery({ queryKey: QUERY_KEYS.me.streamer.overlays, queryFn: getOverlays });

export const useSaveOverlay = () =>
  useMutation({
    mutationFn: saveOverlay,
    meta: {
      successKey: 'streamer.studio.toast.overlaySaved',
      errorKey: 'streamer.studio.toast.failed',
      invalidates: [QUERY_KEYS.me.streamer.overlays]
    }
  });

export const useRemoveOverlay = () =>
  useMutation({
    mutationFn: removeOverlay,
    meta: {
      successKey: 'streamer.studio.toast.overlayRemoved',
      errorKey: 'streamer.studio.toast.failed',
      invalidates: [QUERY_KEYS.me.streamer.overlays]
    }
  });
