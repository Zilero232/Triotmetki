'use client';

import { useTranslations } from 'next-intl';

import { EmptyState, QueryState } from '@/ui-kit';

import type { SupertestFeedProps } from './SupertestFeed.types';

import { useSupertestFeed } from '../../../model/hooks';
import { AnnouncementCard } from '../AnnouncementCard';
import { SupertestSkeleton } from '../SupertestSkeleton';

import s from './SupertestFeed.module.scss';

export const SupertestFeed = ({ scope }: SupertestFeedProps) => {
  const t = useTranslations('supertest');
  const query = useSupertestFeed({ scope });

  return (
    <QueryState
      empty={<EmptyState description={t(`empty.${scope}`)} title={t('empty.title')} />}
      errorTitle={t('error')}
      query={query}
      skeleton={<SupertestSkeleton />}
    >
      {(announcements) => (
        <ul className={s.root}>
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <AnnouncementCard announcement={announcement} />
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  );
};
