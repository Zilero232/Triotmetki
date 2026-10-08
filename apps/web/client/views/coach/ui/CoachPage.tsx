'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Avatar, Badge, PageHeader, Skeleton, TextCard } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { CoachPageProps } from './CoachPage.types';

import { useCoach } from '../model/hooks';
import { CoachContacts, CoachOffers, CoachRequestForm, CoachSummary, CoachTanks } from './components';

import s from './CoachPage.module.scss';

export const CoachPage = ({ userId }: CoachPageProps) => {
  const t = useTranslations('coaching');
  const tNav = useTranslations('nav.items');
  const query = useCoach(userId);

  return (
    <div className={s.root}>
      <ResourceGate
        skeleton={
          <>
            <Skeleton height={96} />
            <Skeleton height={240} />
          </>
        }
        back={{ href: ROUTES.coaching.list, label: t('coach.back') }}
        error={{ title: t('coach.errorTitle'), description: t('coach.errorDescription') }}
        header={<PageHeader breadcrumbs={[{ label: tNav('coaching'), href: ROUTES.coaching.list }]} title={tNav('coaching')} />}
        notFound={{ title: t('coach.notFoundTitle'), description: t('coach.notFoundDescription') }}
        query={query}
      >
        {({ coach, vehicles, contacts, offers, profileHref }) => (
          <>
            <PageHeader
              title={
                <span className={s.title}>
                  <Avatar name={coach.name} size='lg' src={coach.image ?? undefined} />
                  {coach.name}
                </span>
              }
              breadcrumbs={[{ label: t('head.title'), href: ROUTES.coaching.list }, { label: coach.name }]}
              description={coach.headline}
              meta={!coach.isActive && <Badge tone='neutral'>{t('coach.inactive')}</Badge>}
            />
            <div className={s.grid}>
              <div className={s.main}>
                <CoachSummary coach={coach} profileHref={profileHref} />
                {coach.bio && <TextCard title={t('coach.about')}>{coach.bio}</TextCard>}
                {vehicles.length > 0 && <CoachTanks vehicles={vehicles} />}
                <CoachOffers offers={offers} />
              </div>
              <aside className={s.side}>
                <CoachContacts contacts={contacts} />
                <CoachRequestForm coach={coach} />
              </aside>
            </div>
          </>
        )}
      </ResourceGate>
    </div>
  );
};
