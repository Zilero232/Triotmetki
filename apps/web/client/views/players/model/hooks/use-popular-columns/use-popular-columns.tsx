'use client';

import type { PopularPlayer } from '@otmetki/schemas';

import { createColumnHelper } from '@tanstack/react-table';
import { useFormatter, useTranslations } from 'next-intl';

import type { TableColumn } from '@/ui-kit';

import { PlayerNameCell } from '@/entities/player/player';
import { RatingValue } from '@/entities/player/stats';
import { CompareToggle } from '@/features/compare/compare-selection';

const column = createColumnHelper<PopularPlayer>();

export const usePopularColumns = (): TableColumn<PopularPlayer>[] => {
  const t = useTranslations('players.columns');
  const tCommon = useTranslations('common');
  const tCompare = useTranslations('compareTray.toggle');
  const format = useFormatter();

  return [
    column.accessor((_, index) => index + 1, {
      id: 'rank',
      header: '#',
      meta: { width: 48, align: 'end', isRank: true }
    }),
    column.accessor('nickname', {
      header: t('player'),
      enableSorting: false,
      cell: ({ row: { original } }) => <PlayerNameCell clanTag={original.clanTag} nickname={original.nickname} />,
      meta: { isSticky: true }
    }),
    column.accessor('views', {
      header: t('views'),
      cell: (info) => format.number(info.getValue(), 'integer'),
      meta: { align: 'end', isNumeric: true, bar: { tone: 'steel' } }
    }),
    column.accessor((row) => row.wn8.value, {
      id: 'wn8',
      header: tCommon('ratings.wn8'),
      cell: (info) => <RatingValue rating={info.row.original.wn8} />,
      meta: { align: 'end', isNumeric: true }
    }),
    column.display({
      id: 'compare',
      header: tCompare('column'),
      cell: ({ row: { original } }) => <CompareToggle entry={{ kind: 'player', item: original }} />,
      meta: { width: 40, hideBelow: 'md' }
    })
  ];
};
