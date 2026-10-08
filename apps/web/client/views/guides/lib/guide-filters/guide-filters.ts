import type { GuideListQuery } from '@/entities/guide/guide';

import type { GuideFilters, ToGuideListQueryInput } from './guide-filters.types';

export const toGuideListQuery = ({ filters, pageSize }: ToGuideListQueryInput): GuideListQuery => ({
  sort: filters.sort,
  limit: pageSize,
  ...(filters.kind === null ? {} : { kind: filters.kind }),
  ...(filters.tank === null ? {} : { tankId: filters.tank }),
  ...(filters.map === null || filters.map === '' ? {} : { arenaId: filters.map })
});

export const hasActiveFilters = (filters: GuideFilters): boolean => filters.kind !== null || filters.tank !== null || filters.map !== null;
