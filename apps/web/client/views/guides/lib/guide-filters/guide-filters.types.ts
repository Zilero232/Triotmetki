import type { GuideKind, GuideSort } from '@/entities/guide/guide';

export type GuideFilters = {
  kind: GuideKind | null;
  tank: number | null;
  map: string | null;
  sort: GuideSort;
};

export type ToGuideListQueryInput = {
  filters: GuideFilters;
  pageSize: number;
};
