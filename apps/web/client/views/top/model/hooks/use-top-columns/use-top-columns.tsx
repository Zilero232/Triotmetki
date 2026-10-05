'use client';

import type { LeaderboardEntry } from '@otmetki/schemas';

import { createColumnHelper } from '@tanstack/react-table';
import { useFormatter, useTranslations } from 'next-intl';

import type { TableColumn } from '@/ui-kit';

import { useProfilesCosmetics } from '@/entities/player/cosmetics';
import { TankCell } from '@/entities/tank/tank';
import { CompareToggle } from '@/features/compare/compare-selection';

import type { UseTopColumnsInput } from './use-top-columns.types';

import { EntrantCell, ValueCell } from '../../../ui/components/TopTable/components';

const column = createColumnHelper<LeaderboardEntry>();

export const useTopColumns = ({ filter, tank, entries }: UseTopColumnsInput): TableColumn<LeaderboardEntry>[] => {
  const t = useTranslations('top');
  const tCompare = useTranslations('compareTray.toggle');
  const format = useFormatter();
  const cosmetics = useProfilesCosmetics(entries.flatMap((entry) => (entry.accountId === null ? [] : [entry.accountId])));

  const rank = column.accessor('rank', {
    header: '#',
    meta: { width: 48, align: 'end', isRank: true }
  });

  const entrant = column.accessor('name', {
    header: filter.scope === 'clans' ? t('columns.clan') : t('columns.player'),
    cell: ({ row: { original } }) => (
      <EntrantCell badge={original.accountId === null ? null : (cosmetics[original.accountId]?.badge ?? null)} entry={original} />
    ),
    meta: { isSticky: true }
  });

  const compare =
    filter.scope === 'clans'
      ? []
      : [
          column.display({
            id: 'compare',
            header: tCompare('column'),
            cell: ({ row: { original } }) =>
              original.accountId === null ? null : (
                <CompareToggle entry={{ kind: 'player', item: { accountId: original.accountId, nickname: original.name } }} />
              ),
            meta: { width: 40, hideBelow: 'md' }
          })
        ];

  const vehicle = tank
    ? [
        column.display({
          id: 'tank',
          header: t('columns.tank'),
          cell: () => <TankCell vehicle={tank} />,
          meta: { isMedia: true, hideBelow: 'md' }
        })
      ]
    : [];

  const battles = column.accessor('battles', {
    header: t('columns.battles'),
    cell: (info) => format.number(info.getValue()),
    meta: { align: 'end', isNumeric: true, hideBelow: 'sm' }
  });

  const value = column.accessor('value', {
    header: filter.scope === 'marks' ? t('marksLabel') : t(`metrics.${filter.metric}`),
    cell: ({ row: { original } }) => <ValueCell entry={original} filter={filter} />,
    meta: { align: 'end', isNumeric: true, bar: { tone: 'accent' } }
  });

  return [rank, entrant, ...vehicle, battles, value, ...compare];
};
