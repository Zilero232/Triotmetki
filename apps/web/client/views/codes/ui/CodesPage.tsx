'use client';

import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionStrip, DataSourceNote, KeyFigure, PageHero, QueryState, Skeleton, Tabs } from '@/ui-kit';

import { CODES } from '../config';
import { useBonusCodes } from '../model/hooks';
import { CodeAlert, CodeList } from './components';

import s from './CodesPage.module.scss';

export const CodesPage = () => {
  const t = useTranslations('codes');
  const codes = useBonusCodes();

  return (
    <div className={s.root}>
      <PageHero
        figures={
          codes.hasFigures && (
            <>
              <KeyFigure label={t('head.activeFigure')} value={codes.activeCount} variant='compact' />
              {codes.expiringCount !== null && <KeyFigure label={t('head.expiringFigure')} value={codes.expiringCount} variant='compact' />}
            </>
          )
        }
        art={{ kind: 'emblem', glyph: <Gift size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('head.title') }]}
        lead={t('head.description')}
        title={t('head.title')}
      />
      <ActionStrip start={<CodeAlert />} />
      <div className={s.body}>
        <QueryState
          errorDescription={t('error.description')}
          errorTitle={t('error.title')}
          query={codes.query}
          skeleton={<Skeleton count={CODES.skeletons} height={132} shape='block' />}
        >
          {({ active, expired }) => (
            <Tabs
              items={[
                {
                  value: 'active',
                  label: t('tabs.active'),
                  count: active.length,
                  content: <CodeList codes={active} emptyTitle={t('empty.active')} />
                },
                {
                  value: 'expired',
                  label: t('tabs.expired'),
                  count: expired.length,
                  content: <CodeList codes={expired} emptyTitle={t('empty.expired')} />
                }
              ]}
              value={codes.tab}
              variant='panel'
              onValueChange={codes.setTab}
            />
          )}
        </QueryState>
        <DataSourceNote />
      </div>
    </div>
  );
};
