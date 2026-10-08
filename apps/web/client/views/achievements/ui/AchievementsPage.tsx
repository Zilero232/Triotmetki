'use client';

import { Medal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import { ActionStrip, Card, KeyFigure, PageHero, Tabs } from '@/ui-kit';

import { ACHIEVEMENTS_TABS } from '../config';
import { useAchievementsPage } from '../model/hooks';
import { CollectorsTab, MedalsTab, TankRarityTab } from './components';

import s from './AchievementsPage.module.scss';

export const AchievementsPage = () => {
  const t = useTranslations('achievements');
  const { tab, catalog, onTabChange } = useAchievementsPage();

  return (
    <div className={s.root}>
      <PageHero
        figures={
          catalog && (
            <>
              <KeyFigure label={t('hero.sample')} value={catalog.sample} variant='compact' />
              <KeyFigure label={t('hero.catalog')} value={catalog.catalogSize} variant='compact' />
              {catalog.rarest && <KeyFigure label={t('hero.rarest')} value={catalog.rarest.title} variant='compact' />}
            </>
          )
        }
        art={{ kind: 'emblem', glyph: <Medal size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('hero.title') }]}
        lead={t('hero.lead')}
        title={t('hero.title')}
      />
      <ActionStrip
        align='bottom'
        start={<Tabs items={ACHIEVEMENTS_TABS.map((value) => ({ value, label: t(`tabs.${value}`) }))} value={tab} onValueChange={onTabChange} />}
      />
      <div className={s.content}>
        <Card padding='none'>
          <div className={s.body}>
            {match(tab)
              .with('medals', () => <MedalsTab />)
              .with('tanks', () => <TankRarityTab />)
              .with('collectors', () => <CollectorsTab />)
              .exhaustive()}
          </div>
        </Card>
      </div>
    </div>
  );
};
