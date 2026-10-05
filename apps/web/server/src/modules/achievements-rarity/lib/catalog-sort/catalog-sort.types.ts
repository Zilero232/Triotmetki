import type { ACHIEVEMENTS_VIEW } from '../../config/view.constants';

type CatalogSort = (typeof ACHIEVEMENTS_VIEW.catalogSorts)[number];

export type SortableAchievement = {
  name: string;
  share: number | null;
  points: number | null;
  order: number | null;
};

export type RarityRanked = Pick<SortableAchievement, 'name' | 'share'>;

export type SortCatalogInput<T extends SortableAchievement> = {
  items: readonly T[];
  sort: CatalogSort;
};
