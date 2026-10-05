'use client';

import type { MoeRow } from '@otmetki/schemas';

import { createColumnHelper } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import type { TableColumn } from '@/ui-kit';

import { TierCell } from '@/entities/tank/tank';
import { PinToggle } from '@/features/app/pin-rows';
import { CompareToggle } from '@/features/compare/compare-selection';
import { isPinnedCell } from '@/shared/lib';
import { DeltaCell } from '@/ui-kit';
import { ROW_ACTIONS, RowActions, RowActionsHeader } from '@/widgets/table/row-actions';

import { DRAWER_THRESHOLDS, MOE_LIST, NUMERIC_COLUMN } from '../../../config';
import { DetailsCell, DetailsHeaderCell, SweatCell, TankLinkCell, ThresholdCell } from '../../../ui/components/MarksTable/components';

const column = createColumnHelper<MoeRow>();

export const useMarksColumns = (onSelect: (row: MoeRow) => void): TableColumn<MoeRow>[] => {
  const t = useTranslations('marks.table.columns');
  const tPin = useTranslations('common.pin');
  const tCompare = useTranslations('compareTray.toggle');

  return [
    column.display({
      id: 'pin',
      header: tPin('column'),
      cell: ({ row, table }) => <PinToggle id={row.id} isOn={isPinnedCell({ row, table })} name={row.original.vehicle.name} scope='tanks' />,
      meta: { width: MOE_LIST.pinWidth, hideBelow: ROW_ACTIONS.showBelow }
    }),
    column.display({
      id: 'compare',
      header: tCompare('column'),
      cell: ({ row }) => <CompareToggle entry={{ kind: 'tank', item: row.original.vehicle }} />,
      meta: { width: MOE_LIST.pinWidth, hideBelow: ROW_ACTIONS.showBelow }
    }),
    column.accessor((row) => row.vehicle.name, {
      id: 'tank',
      header: t('tank'),
      cell: ({ row }) => <TankLinkCell vehicle={row.original.vehicle} />,
      meta: { width: '34%', isSticky: true }
    }),
    column.accessor((row) => row.vehicle.tier, {
      id: 'tier',
      header: t('tier'),
      cell: ({ row }) => <TierCell isTopAccented={false} tier={row.original.vehicle.tier} />,
      meta: { align: 'center', hideBelow: 'sm' }
    }),
    ...DRAWER_THRESHOLDS.map(({ key, marks }) =>
      column.accessor((row) => row.moe?.[key] ?? 0, {
        id: key,
        header: t(`thresholds.${key}`),
        cell: ({ row }) => <ThresholdCell isKey={key === 'p95'} marks={marks} value={row.original.moe?.[key] ?? null} />,
        meta: key === 'p95' ? NUMERIC_COLUMN : { ...NUMERIC_COLUMN, hideBelow: key === 'p100' ? 'lg' : 'md' }
      })
    ),
    column.accessor((row) => row.trend.p95Delta30d ?? 0, {
      id: 'delta',
      header: t('delta'),
      cell: ({ row }) => <DeltaCell isLowerBetter value={row.original.trend.p95Delta30d} />,
      meta: { ...NUMERIC_COLUMN, hideBelow: 'sm' }
    }),
    column.accessor((row) => row.sweat.moe ?? 0, {
      id: 'sweat',
      header: t('sweat'),
      cell: ({ row }) => <SweatCell sweat={row.original.sweat} />,
      meta: { align: 'center', hideBelow: 'lg' }
    }),
    column.display({
      id: 'details',
      header: () => <DetailsHeaderCell />,
      cell: ({ row }) => <DetailsCell tank={row.original.vehicle.name} onClick={() => onSelect(row.original)} />,
      meta: { align: 'end' }
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
      meta: { align: 'end', width: ROW_ACTIONS.width, showBelow: ROW_ACTIONS.showBelow }
    })
  ];
};
