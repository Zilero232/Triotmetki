'use client';

import { useQueryStates } from 'nuqs';

import type { GuideSort } from '@/entities/guide/guide';

import type { GuideKindFilter } from './use-guide-filters.types';

import { GUIDE_FILTER_PARSERS } from '../../../config';

export const useGuideFilters = () => {
  const [filters, setFilters] = useQueryStates(GUIDE_FILTER_PARSERS, { history: 'replace', scroll: false });

  return {
    filters,
    setKind: (kind: GuideKindFilter) => void setFilters({ kind: kind === 'all' ? null : kind, tank: null, map: null }),
    setTank: (tank: number | null) => void setFilters({ tank }),
    setMap: (map: string | null) => void setFilters({ map }),
    setSort: (sort: GuideSort) => void setFilters({ sort }),
    reset: () => void setFilters(null)
  };
};
