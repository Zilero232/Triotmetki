'use client';

import type { MapSummary } from '@otmetki/schemas';

import { createColumnHelper } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import type { TableColumn } from '@/ui-kit';

import { useMapLabels } from '@/entities/map/map';
import { PinToggle } from '@/features/app/pin-rows';
import { isPinnedCell } from '@/shared/lib';
import { ROW_ACTIONS, RowActions, RowActionsHeader } from '@/widgets/table/row-actions';

import { MAPS_TABLE } from '../../../config';
import { CamouflageCell, MapNameCell } from '../../../ui/components/MapsTable/components';

const column = createColumnHelper<MapSummary>();

export const useMapsColumns = (): TableColumn<MapSummary>[] => {
  const t = useTranslations('maps');
  const tPin = useTranslations('common.pin');
  const labels = useMapLabels();

  return [
    column.display({
      id: 'pin',
      header: tPin('column'),
      cell: ({ row, table }) => <PinToggle id={row.id} isOn={isPinnedCell({ row, table })} name={row.original.name} scope='maps' />,
      meta: { width: MAPS_TABLE.pinWidth, hideBelow: ROW_ACTIONS.showBelow }
    }),
    column.display({
      id: ROW_ACTIONS.id,
      header: () => <RowActionsHeader />,
      cell: ({ row, table }) => <RowActions name={row.original.name} pin={{ id: row.id, isOn: isPinnedCell({ row, table }), scope: 'maps' }} />,
      meta: { width: ROW_ACTIONS.width, showBelow: ROW_ACTIONS.showBelow }
    }),
    column.accessor('name', {
      header: t('columns.name'),
      cell: ({ row: { original } }) => <MapNameCell name={original.name} slug={original.slug} />,
      meta: { isSticky: true }
    }),
    column.accessor((row) => row.camouflage ?? '', {
      id: 'camouflage',
      header: t('columns.camouflage'),
      cell: ({ row: { original } }) => <CamouflageCell camouflage={original.camouflage} />
    }),
    column.accessor((row) => row.sizeMeters ?? 0, {
      id: 'size',
      header: t('columns.size'),
      cell: ({ row: { original } }) => (original.sizeMeters === null ? '—' : t('size', { size: original.sizeMeters })),
      meta: { align: 'end', isNumeric: true }
    }),
    column.accessor((row) => row.modes.length, {
      id: 'modes',
      header: t('columns.modes'),
      enableSorting: false,
      cell: ({ row: { original } }) => labels.modes(original.modes).join(' · ')
    })
  ];
};
