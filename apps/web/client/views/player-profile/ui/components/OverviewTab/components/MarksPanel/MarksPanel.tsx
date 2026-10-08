'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId } from 'react';

import { MarkProgress } from '@/entities/player/marks';
import { TankLink } from '@/entities/tank/tank';
import { Band, EmptyState, ProgressRing, QueryState, Skeleton } from '@/ui-kit';

import { OVERVIEW } from '../../../../../config';
import { useOverviewMarks } from '../../../../../model/hooks';
import { MarksSummary } from '../../../MarksSummary';

import s from './MarksPanel.module.scss';

export const MarksPanel = () => {
  const t = useTranslations('profile.overview');
  const format = useFormatter();
  const titleId = useId();
  const { counts, closest, query } = useOverviewMarks();

  return (
    <Band aria-labelledby={titleId} className={s.band} innerClassName={s.inner}>
      <div className={s.summary}>
        <h2 className={s.title} id={titleId}>
          {t('marksTitle')}
        </h2>
        <ProgressRing
          label={t('marksRing', { count: counts.moe3, total: counts.tanksOwned })}
          marks={3}
          max={Math.max(counts.tanksOwned, 1)}
          size={OVERVIEW.marksRing.size}
          thickness={OVERVIEW.marksRing.thickness}
          value={counts.moe3}
        >
          <span className={s.total}>{format.number(counts.moe3)}</span>
          <span className={s.totalLabel}>{t('marksOf', { total: counts.tanksOwned })}</span>
        </ProgressRing>
        <MarksSummary counts={counts} />
      </div>
      <div className={s.closest}>
        <h3 className={s.heading}>{t('closestTitle')}</h3>
        <QueryState
          isCompact
          empty={<EmptyState isCompact title={t('closestEmpty')} />}
          isEmpty={() => closest.length === 0}
          query={query}
          skeleton={<Skeleton height={OVERVIEW.listSkeletonHeight} shape='block' />}
        >
          <ol className={s.grid}>
            {closest.map(({ vehicle, percent, damageToNext }) => (
              <MarkProgress
                key={vehicle.tankId}
                as='li'
                damageToNext={damageToNext}
                percent={percent}
                title={<TankLink vehicle={vehicle} />}
                variant='card'
              />
            ))}
          </ol>
        </QueryState>
      </div>
    </Band>
  );
};
