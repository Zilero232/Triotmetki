'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { decodeArmorModel, getArmorShowcase } from '@/entities/armor/armor-model';
import { QUERY_KEYS } from '@/shared/constants';

import type { UseShowcaseModelInput } from './use-showcase-model.types';

import { showcaseRig } from '../../../lib/showcase-rig';

export const useShowcaseModel = ({ slug, onReady }: UseShowcaseModelInput) => {
  const { data } = useQuery({
    queryKey: QUERY_KEYS.tanks.armorShowcase(slug),
    queryFn: ({ signal }) => getArmorShowcase({ idOrSlug: slug, signal }),
    select: decodeArmorModel,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    retry: false
  });

  const shownSlug = data?.response.vehicle.slug ?? null;
  const rig = useMemo(() => (data ? showcaseRig({ geometry: data.geometry, modules: data.response.modules }) : null), [data]);

  useEffect(() => {
    if (shownSlug) {
      onReady(shownSlug);
    }
  }, [shownSlug, onReady]);

  return { rig, shownSlug, vehicleType: data?.response.vehicle.type ?? null };
};
