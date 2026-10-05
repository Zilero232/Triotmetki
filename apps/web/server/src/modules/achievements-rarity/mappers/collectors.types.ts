import type { AccountAchievements, Player } from '../../../../generated';
import type { CatalogRow } from '../achievements-rarity.types';
import type { SeriesProgress } from '../lib/series-progress/series-progress.types';

type CollectorSourceRow = Pick<AccountAchievements, 'accountId' | 'completion' | 'held' | 'points'> & {
  player: Pick<Player, 'clanId' | 'nickname'>;
};

export type CollectorRowInput = {
  row: CollectorSourceRow;
  rank: number;
  clanTag: string | null;
};

export type ToSeriesViewInput = {
  row: SeriesProgress;
  items: ReadonlyMap<string, Pick<CatalogRow, 'image' | 'title' | 'titleEn'>>;
};
