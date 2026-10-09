'use client';

import { useQuery } from '@tanstack/react-query';

import { useModpackAvailability } from '@/entities/mod/modpack-release';
import { listTankStats } from '@/entities/tank/tank';
import { QUERY_KEYS } from '@/shared/constants';

import { PROMO_TANKS } from '../../../config';

export const usePromoSources = () => {
  const { isPublished } = useModpackAvailability();
  const { data: tanks = [] } = useQuery({
    queryKey: QUERY_KEYS.tanks.stats(PROMO_TANKS),
    queryFn: ({ signal }) => listTankStats({ ...PROMO_TANKS, signal }),
    select: ({ items }) => items.map(({ vehicle }) => vehicle)
  });

  return { isModpackPublished: isPublished, tanks };
};
