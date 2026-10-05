import type { CollectorRow, PlayerCollection } from '../achievements-rarity.types';
import type { CollectorRowInput, ToSeriesViewInput } from './collectors.types';

export const toCollectorRow = ({ row, rank, clanTag }: CollectorRowInput): CollectorRow => ({
  rank,
  accountId: Number(row.accountId),
  nickname: row.player.nickname,
  clanTag,
  held: row.held,
  points: row.points,
  completion: row.completion
});

export const toSeriesView = ({ row, items }: ToSeriesViewInput): PlayerCollection['series'][number] => ({
  ...row,
  title: items.get(row.name)?.title ?? row.name,
  titleEn: items.get(row.name)?.titleEn ?? null,
  image: items.get(row.name)?.image ?? null
});
