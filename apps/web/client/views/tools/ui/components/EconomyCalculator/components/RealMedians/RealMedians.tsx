'use client';

import { useTranslations } from 'next-intl';

import { EmptyState, ErrorState, Skeleton } from '@/ui-kit';

import type { RealMediansProps } from './RealMedians.types';

import { TOOLS_FORMAT, TOOLS_LAYOUT } from '../../../../../config';
import { ResultFigure } from '../../../ResultFigure';

import s from './RealMedians.module.scss';

export const RealMedians = ({ vehicle, medians, isPending, isError, isRetrying, onRetry }: RealMediansProps) => {
  const t = useTranslations('tools.economy.real');

  if (!vehicle) {
    return <p className={s.hint}>{t('pickHint')}</p>;
  }

  if (isPending) {
    return <Skeleton height={TOOLS_LAYOUT.mediansSkeleton} shape='block' />;
  }

  if (isError) {
    return <ErrorState isCompact isRetrying={isRetrying} onRetry={onRetry} />;
  }

  const { premium, standard, windowDays } = medians;

  if (!premium && !standard) {
    return <EmptyState isCompact description={t('emptyDescription')} title={t('emptyTitle', { tank: vehicle.shortName })} />;
  }

  return (
    <section aria-label={t('title', { tank: vehicle.shortName })} className={s.root}>
      <h3 className={s.title}>{t('title', { tank: vehicle.shortName })}</h3>
      <div className={s.figures}>
        <ResultFigure fallback='—' label={t('credits')} size='md' value={standard?.credits ?? null} />
        <ResultFigure fallback='—' format={TOOLS_FORMAT.signed} label={t('net')} size='md' value={standard?.net ?? null} />
        <ResultFigure fallback='—' label={t('creditsPremium')} size='md' value={premium?.credits ?? null} />
        <ResultFigure fallback='—' format={TOOLS_FORMAT.signed} label={t('netPremium')} size='md' value={premium?.net ?? null} />
      </div>
      <p className={s.hint}>{t('note', { days: windowDays })}</p>
    </section>
  );
};
