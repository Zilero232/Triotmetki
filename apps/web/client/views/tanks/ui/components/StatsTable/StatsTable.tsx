'use client';

import { useTranslations } from 'next-intl';

import { TankCard } from '@/entities/tank/tank';
import { CompareToggle } from '@/features/compare/compare-selection';
import { ROUTES } from '@/shared/constants';
import { DataTable, FilteredEmptyState, QueryState } from '@/ui-kit';

import { TANKS_VIEW } from '../../../config';
import { useStatsTable } from '../../../model/hooks';
import { TableTools } from './components';

export const StatsTable = () => {
  const t = useTranslations('tanks.table');
  const { columns, query, rows, pinnedIds, isPinPending, visibleColumns, isFiltered, onReset, onColumnsChange, onExport } = useStatsTable();

  return (
    <QueryState
      errorDescription={t('errorDescription')}
      errorTitle={t('errorTitle')}
      query={query}
      skeleton={<DataTable isLoading caption={t('caption', { count: 0 })} columns={columns} data={[]} rowHeight={TANKS_VIEW.rowHeight} />}
    >
      {({ total }) => (
        <DataTable
          emptyState={
            <FilteredEmptyState isFiltered={isFiltered} title={isFiltered ? t('emptyTitle') : t('noStatsTitle')} titleAs='h2' onReset={onReset} />
          }
          caption={t('caption', { count: total })}
          columns={columns}
          data={rows}
          getRowId={(row) => String(row.vehicle.tankId)}
          getRowLink={(row) => ({ href: ROUTES.tanks.detail(row.vehicle.slug), label: row.vehicle.name })}
          initialSorting={[{ id: 'battles', desc: true }]}
          isLoading={isPinPending}
          pinnedRowIds={pinnedIds}
          renderCard={(row) => <TankCard action={<CompareToggle entry={{ kind: 'tank', item: row.vehicle }} />} row={row} />}
          rowHeight={TANKS_VIEW.rowHeight}
          toolbar={<TableTools visible={visibleColumns} onExport={onExport} onVisibleChange={onColumnsChange} />}
        />
      )}
    </QueryState>
  );
};
