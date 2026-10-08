'use client';

import type { LeaderboardScope } from '@otmetki/schemas';

import { useTranslations } from 'next-intl';

import { ActionStrip, Card, DataSourceNote, Tabs } from '@/ui-kit';

import { TOP_SCOPES } from '../../../config';
import { useTopParams } from '../../../model/hooks';
import { HallOfFame } from '../HallOfFame';
import { TopFilters } from '../TopFilters';
import { TopPodium } from '../TopPodium';
import { TopTable } from '../TopTable';

import s from './TopBody.module.scss';

export const TopBody = () => {
  const t = useTranslations('top');
  const [{ scope }, setParams] = useTopParams();

  return (
    <>
      <ActionStrip
        start={
          <Tabs<LeaderboardScope>
            items={TOP_SCOPES.map((value) => ({ value, label: t(`scopes.${value}`) }))}
            value={scope}
            onValueChange={(next) => void setParams({ scope: next })}
          />
        }
        align='bottom'
      />
      <div className={s.content}>
        <TopPodium />
        <Card padding='none'>
          <TopFilters />
          <div className={s.body}>
            <TopTable />
          </div>
        </Card>
        <HallOfFame />
        <DataSourceNote />
      </div>
    </>
  );
};
