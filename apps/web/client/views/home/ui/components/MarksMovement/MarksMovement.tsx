'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { TankShowcaseCard } from '@/entities/tank/tank';
import { ROUTES } from '@/shared/constants';
import { Band, Card, DataSourceNote, DataTable, EmptyState, QueryState, SectionHeader, Skeleton } from '@/ui-kit';

import { HOME } from '../../../config';
import { useMarksMovement, useMarksMovementColumns } from '../../../model/hooks';

import s from './MarksMovement.module.scss';

export const MarksMovement = () => {
  const t = useTranslations('home.marks');
  const titleId = useId();
  const { query, updatedAt, isEmpty, leaderFigures } = useMarksMovement();
  const columns = useMarksMovementColumns();

  return (
    <Band aria-labelledby={titleId} className={s.band} data-empty={isEmpty} innerClassName={s.inner}>
      <SectionHeader id={titleId} meta={t('period')} more={{ href: ROUTES.marks, label: t('all') }} title={t('title')} variant='display' />
      <QueryState
        isCompact
        skeleton={
          <div className={s.split}>
            <Card padding='none'>
              <DataTable isLoading columns={columns} data={[]} density='media' />
            </Card>
            <div className={s.leaders}>
              <h3 className={s.subtitle}>{t('leaders')}</h3>
              <Skeleton className={s.skeleton} count={HOME.marks.highlights} height={HOME.marks.skeletonHeight} shape='block' />
            </div>
          </div>
        }
        empty={<EmptyState isCompact isFramed title={t('empty')} />}
        isEmpty={({ rows }) => rows.length === 0}
        query={query}
      >
        {({ rows, leaders }) => (
          <div className={s.split}>
            <Card padding='none'>
              <DataTable
                caption={t('title')}
                columns={columns}
                data={rows}
                density='media'
                getRowId={(row) => String(row.vehicle.tankId)}
                getRowLink={({ vehicle }) => ({ href: ROUTES.tanks.detail(vehicle.slug), label: vehicle.name })}
              />
            </Card>
            <div className={s.leaders}>
              <h3 className={s.subtitle}>{t('leaders')}</h3>
              {leaders.map((row) => (
                <TankShowcaseCard key={row.vehicle.tankId} figures={leaderFigures(row)} layout='row' vehicle={row.vehicle} />
              ))}
            </div>
          </div>
        )}
      </QueryState>
      {!isEmpty && <DataSourceNote updatedAt={updatedAt} />}
    </Band>
  );
};
