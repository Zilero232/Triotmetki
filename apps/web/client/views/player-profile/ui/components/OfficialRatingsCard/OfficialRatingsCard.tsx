'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { percentText } from '@/shared/lib';
import { DeltaValue, Skeleton } from '@/ui-kit';

import { OFFICIAL_CARD } from '../../../config';
import { useOfficialRatings } from '../../../model/hooks';
import { ProfilePanel } from '../ProfilePanel';

import s from './OfficialRatingsCard.module.scss';

export const OfficialRatingsCard = () => {
  const t = useTranslations('profile.official');
  const format = useFormatter();
  const { periods, isLoading, isVisible } = useOfficialRatings();

  if (isLoading) {
    return <Skeleton height={OFFICIAL_CARD.skeletonHeight} shape='block' />;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <ProfilePanel meta={t('source')} title={t('title')}>
      <p className={s.lead}>{t('lead')}</p>
      <div className={s.periods}>
        {periods.map(({ period, cells }) => (
          <section key={period} aria-label={t(`periods.${period}`)} className={s.period}>
            <h3 className={s.periodTitle}>{t(`periods.${period}`)}</h3>
            <dl className={s.grid}>
              {cells.map(({ field, value, isPercent, rank, rankDelta }) => (
                <div key={field} className={s.cell}>
                  <dt className={s.label}>{t(`fields.${field}`)}</dt>
                  <dd className={s.value}>
                    {value === null ? '—' : isPercent ? percentText({ format, value }) : format.number(value, { maximumFractionDigits: 0 })}
                  </dd>
                  {rank !== null && (
                    <dd className={s.rank}>
                      {t('rank', { rank })}
                      {rankDelta !== null && <DeltaValue value={rankDelta} />}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </ProfilePanel>
  );
};
