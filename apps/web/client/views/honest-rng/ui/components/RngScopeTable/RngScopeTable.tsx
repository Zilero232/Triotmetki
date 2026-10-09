import { useFormatter, useTranslations } from 'next-intl';

import { Card, CardHeader, DeltaValue, EmptyState } from '@/ui-kit';

import type { RngScopeTableProps } from './RngScopeTable.types';

import s from './RngScopeTable.module.scss';

export const RngScopeTable = ({ title, scopeLabel, rows }: RngScopeTableProps) => {
  const t = useTranslations('honestRng.columns');
  const format = useFormatter();

  return (
    <Card padding='none'>
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <EmptyState isCompact title={t('empty')} />
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th scope='col'>{scopeLabel}</th>
              <th scope='col'>{t('shots')}</th>
              <th scope='col'>{t('meanRoll')}</th>
              <th scope='col'>{t('within')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope='row'>{row.label}</th>
                <td>{format.number(row.shots)}</td>
                <td>{row.meanRoll === null ? '—' : <DeltaValue format={{ maximumFractionDigits: 1 }} suffix='%' value={row.meanRoll} />}</td>
                <td>{row.within === null ? '—' : format.number(row.within / 100, { style: 'percent', maximumFractionDigits: 1 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};
