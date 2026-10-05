'use client';

import { useTranslations } from 'next-intl';

import { PlusGate } from '@/features/plus/plus-gate';
import { TanksHubNav } from '@/widgets/tank/tanks-hub-nav';

import { useTanksState } from '../model/hooks';
import { EconomyTable, MyEconomy, StatsControls, StatsTable, TanksFilters, TanksHero, TierList } from './components';

import s from './TanksPage.module.scss';

export const TanksPage = () => {
  const t = useTranslations('tanks');
  const [{ view }] = useTanksState();

  return (
    <div className={s.root}>
      <TanksHero />
      <div className={s.body}>
        <TanksHubNav current='stats' />
        <TanksFilters />
        <StatsControls />
        {view === 'table' && <StatsTable />}
        {view === 'tierlist' && <TierList />}
        {view === 'economy' && (
          <>
            <PlusGate feature='analytics'>
              <MyEconomy />
            </PlusGate>
            <EconomyTable />
          </>
        )}
        <p className={s.source}>{t('source')}</p>
      </div>
    </div>
  );
};
