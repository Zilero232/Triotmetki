'use client';

import { COMPARE } from '@otmetki/schemas';
import { useTranslations } from 'next-intl';

import { Button, EmptyState, QueryState } from '@/ui-kit';

import { useCompareBoard } from '../../../model/hooks';
import { BoardSkeleton } from '../BoardSkeleton';
import { ColumnHead } from '../ColumnHead';
import { ValueCell } from '../ValueCell';

import s from './CompareBoard.module.scss';

export const CompareBoard = () => {
  const t = useTranslations('tanks.compare.board');
  const { count, sections, query, isStatsErrorOf, onRetryStats, onClear, onRemove } = useCompareBoard();

  return (
    <QueryState
      empty={
        <EmptyState
          action={
            <Button size='sm' variant='secondary' onClick={onClear}>
              {t('clear')}
            </Button>
          }
          description={t('notFoundDescription')}
          title={t('notFoundTitle')}
        />
      }
      errorTitle={t('errorTitle')}
      query={query}
      skeleton={<BoardSkeleton count={count} />}
    >
      {(vehicles) => (
        <section className={s.root}>
          {vehicles.length < COMPARE.minItems && <p className={s.hint}>{t('addMore')}</p>}
          <div aria-label={t('label')} className={s.scroller} role='region' tabIndex={0}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.corner} scope='col'>
                    {t('count', { count: vehicles.length })}
                  </th>
                  {vehicles.map((vehicle) => (
                    <th key={vehicle.tankId} className={s.head} scope='col'>
                      <ColumnHead
                        isStatsError={isStatsErrorOf(vehicle.tankId)}
                        vehicle={vehicle}
                        onRemove={() => onRemove(vehicle.tankId)}
                        onRetryStats={() => onRetryStats(vehicle.tankId)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              {sections.map((section) => (
                <tbody key={section.id}>
                  <tr>
                    <th className={s.section} colSpan={vehicles.length + 1} scope='colgroup'>
                      {section.title}
                    </th>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.key} className={s.row}>
                      <th className={s.label} scope='row'>
                        {row.label}
                        {row.unit && <span className={s.unit}>{row.unit}</span>}
                      </th>
                      {vehicles.map((vehicle, index) => (
                        <td key={vehicle.tankId} className={s.cell}>
                          <ValueCell cell={row.cells.at(index)} isLoading={section.isLoading} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>
      )}
    </QueryState>
  );
};
