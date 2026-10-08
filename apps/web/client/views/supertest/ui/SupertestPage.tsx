'use client';

import { FlaskConical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlusBadge, PlusGate } from '@/features/plus/plus-gate';
import { ActionStrip, DataSourceNote, KeyFigure, PageHero, Tabs } from '@/ui-kit';

import { SUPERTEST, SUPERTEST_SCOPES } from '../config';
import { useSupertestPage } from '../model/hooks';
import { SupertestFeed } from './components';

import s from './SupertestPage.module.scss';

export const SupertestPage = () => {
  const t = useTranslations('supertest');
  const { scope, totals, onScopeChange } = useSupertestPage();

  return (
    <div className={s.root}>
      <PageHero
        figures={
          totals && (
            <>
              <KeyFigure label={t('hero.tanks')} value={totals.tanks} variant='compact' />
              <KeyFigure label={t('hero.buffs')} tone='good' value={totals.buffs} variant='compact' />
              <KeyFigure label={t('hero.nerfs')} tone='bad' value={totals.nerfs} variant='compact' />
            </>
          )
        }
        art={{ kind: 'emblem', glyph: <FlaskConical size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('hero.title') }]}
        lead={t('hero.lead')}
        title={t('hero.title')}
      />
      <ActionStrip
        start={
          <Tabs
            items={SUPERTEST_SCOPES.map((value) => ({
              value,
              label: t(`scopes.${value}`),
              count: value === SUPERTEST.plusScope ? <PlusBadge /> : undefined
            }))}
            value={scope}
            onValueChange={onScopeChange}
          />
        }
        align='bottom'
      />
      <div className={s.content}>
        {scope === 'mine' ? (
          <PlusGate feature={SUPERTEST.plusFeature}>
            <SupertestFeed scope='mine' />
          </PlusGate>
        ) : (
          <SupertestFeed scope='all' />
        )}
        <DataSourceNote />
      </div>
    </div>
  );
};
