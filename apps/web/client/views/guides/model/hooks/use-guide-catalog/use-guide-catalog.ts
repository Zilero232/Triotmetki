'use client';

import { useAuthSession } from '@/entities/auth/session';
import { listGuides } from '@/entities/guide/guide';
import { QUERY_KEYS } from '@/shared/constants';
import { useOffsetInfiniteList } from '@/shared/lib';

import { GUIDE_LIST } from '../../../config';
import { hasActiveFilters, toGuideListQuery } from '../../../lib/guide-filters';
import { useGuideFilters } from '../use-guide-filters';

export const useGuideCatalog = () => {
  const { filters, reset } = useGuideFilters();
  const { data: session } = useAuthSession();
  const params = toGuideListQuery({ filters, pageSize: GUIDE_LIST.pageSize });
  const list = useOffsetInfiniteList({
    queryKey: QUERY_KEYS.guides.list({ viewerId: session?.user.id ?? null, params }),
    queryFn: ({ offset, signal }) => listGuides({ ...params, offset, signal })
  });

  return {
    list,
    total: list.total,
    hasFilters: hasActiveFilters(filters),
    reset
  };
};
