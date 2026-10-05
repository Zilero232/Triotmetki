'use client';

import { Swords } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ModeSourceNote } from '@/entities/mode/mode';
import { ROUTES } from '@/shared/constants';
import { PageHero, QueryState, Skeleton } from '@/ui-kit';

import { MODES_HUB } from '../config';
import { useModesHub } from '../model/hooks';
import { ModePanel } from './components';

import s from './ModesPage.module.scss';

export const ModesPage = () => {
  const t = useTranslations('modes.hub');
  const tCommon = useTranslations('common');
  const query = useModesHub();

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <Swords size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: tCommon('home'), href: ROUTES.home }, { label: t('title') }]}
        lead={t('description')}
        title={t('title')}
      />
      <div className={s.content}>
        <QueryState
          errorDescription={t('errorDescription')}
          errorTitle={t('errorTitle')}
          query={query}
          skeleton={<Skeleton height={MODES_HUB.skeletonHeight} shape='block' />}
        >
          {({ panels, windowDays, computedAt }) => (
            <>
              <div className={s.grid}>
                {panels.map((panel) => (
                  <ModePanel key={panel.mode} panel={panel} />
                ))}
              </div>
              <ModeSourceNote computedAt={computedAt} windowDays={windowDays} />
            </>
          )}
        </QueryState>
      </div>
    </div>
  );
};
