'use client';

import type { SettingsTableRow } from '@otmetki/schemas';

import { createColumnHelper } from '@tanstack/react-table';
import { useFormatter, useTranslations } from 'next-intl';

import type { TableColumn } from '@/ui-kit';

import { SETTINGS_FORMAT, useSettingsFormatter } from '@/entities/streamer/settings';

import { STREAMERS_SETTINGS_PAGE } from '../../../config';
import { CreatorCell } from '../../../ui/components/SettingsTable/components';

const column = createColumnHelper<SettingsTableRow>();

export const useSettingsTableColumns = (): TableColumn<SettingsTableRow>[] => {
  const t = useTranslations('streamerSettings');
  const format = useFormatter();
  const { optionLabel, numberText } = useSettingsFormatter();

  const optional = (value: string | null): string => (value === null ? SETTINGS_FORMAT.missing : optionLabel(value));

  return [
    column.accessor('displayName', {
      id: 'creator',
      header: t('table.columns.creator'),
      cell: (info) => <CreatorCell row={info.row.original} />,
      meta: { width: '20%' }
    }),
    column.accessor((row) => row.sniperSensitivity ?? -1, {
      id: 'sniper',
      header: t('table.columns.sniper'),
      cell: (info) =>
        info.row.original.sniperSensitivity === null
          ? SETTINGS_FORMAT.missing
          : numberText({ value: info.row.original.sniperSensitivity, digits: STREAMERS_SETTINGS_PAGE.sensitivityDigits }),
      meta: { align: 'end', isNumeric: true }
    }),
    column.accessor((row) => row.fov ?? -1, {
      id: 'fov',
      header: t('table.columns.fov'),
      cell: (info) => (info.row.original.fov === null ? SETTINGS_FORMAT.missing : t('units.deg', { value: format.number(info.row.original.fov) })),
      meta: { align: 'end', isNumeric: true }
    }),
    column.accessor((row) => row.preset ?? '', {
      id: 'preset',
      header: t('table.columns.preset'),
      cell: (info) => optional(info.row.original.preset),
      meta: { hideBelow: 'md' }
    }),
    column.accessor((row) => (row.zoomMax ? Number.parseInt(row.zoomMax.slice(1), 10) : -1), {
      id: 'zoomMax',
      header: t('table.columns.zoomMax'),
      cell: (info) => optional(info.row.original.zoomMax),
      meta: { align: 'end', isNumeric: true, hideBelow: 'lg' }
    }),
    column.accessor((row) => row.modsKind ?? '', {
      id: 'mods',
      header: t('table.columns.mods'),
      cell: (info) => optional(info.row.original.modsKind),
      meta: { hideBelow: 'lg' }
    }),
    column.accessor((row) => row.gpu ?? '', {
      id: 'gpu',
      header: t('table.columns.gpu'),
      cell: (info) => info.row.original.gpu ?? SETTINGS_FORMAT.missing,
      meta: { hideBelow: 'xl' }
    }),
    column.accessor((row) => Date.parse(row.updatedAt), {
      id: 'updated',
      header: t('table.columns.updated'),
      cell: (info) => format.dateTime(new Date(info.row.original.updatedAt), 'date'),
      meta: { align: 'end', hideBelow: 'md' }
    })
  ];
};
