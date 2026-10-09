'use client';

import type { TankServerStatsRow } from '@otmetki/schemas';

import { createColumnHelper } from '@tanstack/react-table';
import { useFormatter, useTranslations } from 'next-intl';

import type { TableColumn } from '@/ui-kit';

import { TankIdentity, vehicleIdentity } from '@/entities/tank/tank';
import { ratingTone } from '@/shared/lib';
import { RatingBadge } from '@/ui-kit';

const column = createColumnHelper<TankServerStatsRow>();

export const useTankColumns = (): TableColumn<TankServerStatsRow>[] => {
  const t = useTranslations('stats');
  const format = useFormatter();

  return [
    column.accessor((row) => row.vehicle.name, {
      id: 'tank',
      header: t('tank'),
      cell: (info) => <TankIdentity image='contour' tank={vehicleIdentity(info.row.original.vehicle)} />,
      meta: { width: '40%' }
    }),
    column.accessor((row) => row.vehicle.tier, {
      id: 'tier',
      header: t('tier'),
      meta: { align: 'end', isNumeric: true, hideBelow: 'sm' }
    }),
    column.accessor('winRate', {
      header: t('winRate'),
      cell: (info) => (
        <RatingBadge
          size='sm'
          tone={ratingTone({ scale: 'winRate', value: info.getValue() })}
          value={format.number(info.getValue() / 100, 'percent')}
          withPips={false}
        />
      ),
      meta: { align: 'end' }
    }),
    column.accessor('avgDamage', {
      header: t('avgDamage'),
      cell: (info) => format.number(info.getValue()),
      meta: { align: 'end', isNumeric: true, hideBelow: 'md' }
    }),
    column.accessor('battles', {
      header: t('battles'),
      cell: (info) => format.number(info.getValue(), { notation: 'compact' }),
      meta: { align: 'end', isNumeric: true, bar: { tone: 'steel' } }
    })
  ];
};
