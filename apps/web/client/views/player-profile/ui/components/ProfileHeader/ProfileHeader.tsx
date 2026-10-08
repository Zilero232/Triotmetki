'use client';

import type { RatingPeriod } from '@otmetki/schemas';

import { useTranslations } from 'next-intl';

import { CosmeticSurface } from '@/entities/player/cosmetics';
import { ROUTES } from '@/shared/constants';
import { PageHero, RelativeTime, SegmentedControl } from '@/ui-kit';

import { useProfileHeader } from '../../../model/hooks';
import { HeaderFigures, HeaderIdentity, HeaderSeasons } from './components';

import s from './ProfileHeader.module.scss';

export const ProfileHeader = () => {
  const t = useTranslations('profile.header');
  const tHero = useTranslations('profile.hero');
  const {
    summary,
    stats,
    wn8Ring,
    art,
    kinds,
    isKindsLoading,
    isKindsFailed,
    hasPeriodData,
    period,
    setPeriod,
    periodOptions,
    badge,
    banner,
    frame,
    seasons
  } = useProfileHeader();

  return (
    <PageHero
      actions={
        <div className={s.actions}>
          <CosmeticSurface banner={banner} className={s.identity} frame={frame}>
            <HeaderIdentity badge={badge} isKindsFailed={isKindsFailed} isKindsLoading={isKindsLoading} kinds={kinds} summary={summary} />
          </CosmeticSurface>
          <div className={s.controls}>
            <SegmentedControl<RatingPeriod> aria-label={t('period')} options={periodOptions} size='sm' value={period} onChange={setPeriod} />
            {!hasPeriodData && <span className={s.note}>{t('noPeriodData')}</span>}
            <HeaderSeasons seasons={seasons} />
            <span className={s.updated}>
              {t('updated')} <RelativeTime value={summary.updatedAt} />
            </span>
          </div>
        </div>
      }
      art={art}
      breadcrumbs={[{ label: tHero('players'), href: ROUTES.players.list }, { label: summary.nickname }]}
      figures={<HeaderFigures ring={wn8Ring} stats={stats} />}
      title={<span className={s.nickname}>{summary.nickname}</span>}
    />
  );
};
