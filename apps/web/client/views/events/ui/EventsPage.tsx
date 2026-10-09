'use client';

import { CalendarDays, CalendarPlus, CalendarX2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionStrip, buttonVariants, CopyField, EmptyState, ErrorState, KeyFigure, PageHero, QueryState, Skeleton, ToggleChips } from '@/ui-kit';

import { EVENTS, EVENTS_FEED } from '../config';
import { useEventCalendar } from '../model/hooks';
import { EventsNow, EventsPast, EventsUpcoming } from './components';

import s from './EventsPage.module.scss';

export const EventsPage = () => {
  const t = useTranslations('events');
  const { query, featured, kinds, setKinds } = useEventCalendar();

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <CalendarDays size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('head.title') }]}
        figures={(query.isPending || featured[0]) && <KeyFigure label={t('head.nowFigure')} value={featured[0]?.event.title} variant='compact' />}
        lead={t('head.description')}
        title={t('head.title')}
      />
      <ActionStrip
        end={
          <>
            <CopyField className={s.feed} label={t('ics.url')} value={EVENTS_FEED.ics} />
            <a className={buttonVariants({ variant: 'primary' })} href={EVENTS_FEED.webcal}>
              <CalendarPlus aria-hidden size={16} />
              {t('ics.subscribeIcs')}
            </a>
          </>
        }
        start={
          <ToggleChips
            aria-label={t('filters.label')}
            options={EVENTS.kinds.map((kind) => ({ value: kind, label: t(`kinds.${kind}`) }))}
            value={kinds}
            onChange={setKinds}
          />
        }
        className={s.strip}
      />
      <QueryState
        empty={
          <div className={s.section}>
            <EmptyState
              isFramed
              description={t('empty.allDescription')}
              icon={<CalendarX2 size={EVENTS.emptyIconSize} />}
              title={t('empty.allTitle')}
            />
          </div>
        }
        errorState={
          <div className={s.section}>
            <ErrorState
              description={t('error.description')}
              isRetrying={query.isRefetching}
              title={t('error.title')}
              onRetry={() => void query.refetch()}
            />
          </div>
        }
        skeleton={
          <div className={s.section}>
            <Skeleton count={EVENTS.skeletons} height={160} shape='block' />
          </div>
        }
        query={query}
      >
        <EventsNow />
        <section className={s.section}>
          <EventsUpcoming />
        </section>
        <section className={s.section}>
          <EventsPast />
        </section>
      </QueryState>
    </div>
  );
};
