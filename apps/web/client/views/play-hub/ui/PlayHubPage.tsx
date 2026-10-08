'use client';

import { CalendarClock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DAILY_PUZZLE_KEYS, DailyPuzzleCard } from '@/entities/play/daily-puzzle';
import { PageHeader } from '@/ui-kit';

import { UpcomingCard } from './components';

import s from './PlayHubPage.module.scss';

export const PlayHubPage = () => {
  const t = useTranslations('play.hub');

  return (
    <div className={s.root}>
      <PageHeader
        meta={
          <span className={s.reset}>
            <CalendarClock aria-hidden size={14} />
            {t('head.reset')}
          </span>
        }
        breadcrumbs={[{ label: t('head.title') }]}
        description={t('head.description')}
        title={t('head.title')}
      />
      <div className={s.grid}>
        {DAILY_PUZZLE_KEYS.map((puzzle) => (
          <DailyPuzzleCard key={puzzle} puzzle={puzzle} />
        ))}
        <UpcomingCard />
      </div>
    </div>
  );
};
