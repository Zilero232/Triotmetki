'use client';

import type { TankServerStatsRow } from '@otmetki/schemas';

import { createColumnHelper } from '@tanstack/react-table';
import { useFormatter, useTranslations } from 'next-intl';

import type { TableColumn } from '@/ui-kit';

import { TankCell, TierCell, WinRateCell } from '@/entities/tank/tank';
import { PinToggle } from '@/features/app/pin-rows';
import { CompareToggle } from '@/features/compare/compare-selection';
import { isPinnedCell, percentText } from '@/shared/lib';
import { DeltaValue } from '@/ui-kit';
import { ROW_ACTIONS, RowActions, RowActionsHeader } from '@/widgets/table/row-actions';

import type { UseTankColumnsInput } from './use-tank-columns.types';

import { TANKS_TABLE } from '../../../config';

const column = createColumnHelper<TankServerStatsRow>();

export const useTankColumns = ({ hidden }: UseTankColumnsInput): TableColumn<TankServerStatsRow>[] => {
  const t = useTranslations('tanks.table');
  const tPin = useTranslations('common.pin');
  const tCompare = useTranslations('compareTray.toggle');
  const format = useFormatter();

  const decimal = (value: number) => format.number(value, { maximumFractionDigits: 2 });
  const integer = (value: number) => format.number(value, { maximumFractionDigits: 0 });

  const columns: TableColumn<TankServerStatsRow>[] = [
    column.display({
      id: 'pin',
      header: tPin('column'),
      cell: ({ row, table }) => <PinToggle id={row.id} isOn={isPinnedCell({ row, table })} name={row.original.vehicle.name} scope='tanks' />,
      meta: { width: TANKS_TABLE.pinWidth, hideBelow: ROW_ACTIONS.showBelow }
    }),
    column.display({
      id: 'compare',
      header: tCompare('column'),
      cell: ({ row }) => <CompareToggle entry={{ kind: 'tank', item: row.original.vehicle }} />,
      meta: { width: TANKS_TABLE.pinWidth, hideBelow: ROW_ACTIONS.showBelow }
    }),
    column.display({
      id: ROW_ACTIONS.id,
      header: () => <RowActionsHeader />,
      cell: ({ row, table }) => (
        <RowActions
          compare={{ kind: 'tank', item: row.original.vehicle }}
          name={row.original.vehicle.name}
          pin={{ id: row.id, isOn: isPinnedCell({ row, table }), scope: 'tanks' }}
        />
      ),
      meta: { width: ROW_ACTIONS.width, showBelow: ROW_ACTIONS.showBelow }
    }),
    column.accessor((row) => row.popularityRank ?? undefined, {
      id: 'rank',
      header: '#',
      sortUndefined: 'last',
      meta: { align: 'end', isRank: true, width: TANKS_TABLE.rankWidth, hideBelow: 'sm' }
    }),
    column.accessor((row) => row.vehicle.name, {
      id: 'tank',
      header: t('tank'),
      cell: (info) => <TankCell imageHideBelow='md' vehicle={info.row.original.vehicle} />,
      meta: { width: TANKS_TABLE.tankWidth, isSticky: true }
    }),
    column.accessor((row) => row.vehicle.tier, {
      id: 'tier',
      header: t('tier'),
      cell: (info) => <TierCell tier={info.getValue()} />,
      meta: { ...TANKS_TABLE.numeric, hideBelow: 'sm' }
    }),
    column.accessor('winRate', { header: t('winRate'), cell: (info) => <WinRateCell value={info.getValue()} />, meta: TANKS_TABLE.numeric }),
    column.accessor('winRateDiff', {
      id: 'winRateDiff',
      header: t('winRateDiff'),
      cell: (info) => <DeltaValue isSameShown value={info.getValue()} />,
      meta: { ...TANKS_TABLE.numeric, hideBelow: 'md' }
    }),
    column.accessor('avgDamage', {
      header: t('avgDamage'),
      cell: (info) => integer(info.getValue()),
      meta: TANKS_TABLE.numeric
    }),
    column.accessor('avgFrags', {
      id: 'avgFrags',
      header: t('frags'),
      cell: (info) => decimal(info.getValue()),
      meta: { ...TANKS_TABLE.numeric, hideBelow: 'lg' }
    }),
    column.accessor('avgSpotted', {
      id: 'avgSpotted',
      header: t('spotted'),
      cell: (info) => decimal(info.getValue()),
      meta: { ...TANKS_TABLE.numeric, hideBelow: 'lg' }
    }),
    column.accessor('survivalRate', {
      id: 'survivalRate',
      header: t('survival'),
      cell: (info) => percentText({ format, value: info.getValue() }),
      meta: { ...TANKS_TABLE.numeric, hideBelow: 'xl' }
    }),
    column.accessor('players', { id: 'players', header: t('players'), cell: (info) => integer(info.getValue()), meta: TANKS_TABLE.secondary }),
    column.accessor('avgXp', { id: 'avgXp', header: t('avgXp'), cell: (info) => integer(info.getValue()), meta: TANKS_TABLE.secondary }),
    column.accessor('avgBlocked', {
      id: 'avgBlocked',
      header: t('avgBlocked'),
      cell: (info) => integer(info.getValue()),
      meta: TANKS_TABLE.secondary
    }),
    column.accessor('accuracy', {
      id: 'accuracy',
      header: t('accuracy'),
      cell: (info) => percentText({ format, value: info.getValue() }),
      meta: TANKS_TABLE.secondary
    }),
    column.accessor('battles', {
      header: t('battles'),
      cell: (info) => format.number(info.getValue()),
      meta: { ...TANKS_TABLE.numeric, bar: { tone: 'steel' } }
    })
  ];

  return columns.filter(({ id }) => id === undefined || !hidden.includes(id));
};
