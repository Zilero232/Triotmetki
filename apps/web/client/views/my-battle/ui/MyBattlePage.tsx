'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, SectionHeader, Skeleton } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { MyBattlePageProps } from './MyBattlePage.types';

import { MY_BATTLE } from '../config';
import { useMyBattle } from '../model/hooks';
import { BattleAnalysisPanel, BattleCard } from './components';

import s from './MyBattlePage.module.scss';

export const MyBattlePage = ({ id }: MyBattlePageProps) => {
  const t = useTranslations('analytics.battle');
  const query = useMyBattle(id);

  return (
    <div className={s.root}>
      <SectionHeader
        action={
          <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} href={ROUTES.account.battles}>
            <ArrowLeft aria-hidden size={14} />
            {t('back')}
          </Link>
        }
        as='h1'
        title={t('title')}
      />
      <ResourceGate
        error={{ title: t('errorTitle'), description: t('errorText') }}
        notFound={{ title: t('notFoundTitle'), description: t('notFoundText') }}
        query={query}
        skeleton={<Skeleton height={MY_BATTLE.skeletonHeight} shape='block' />}
      >
        {(battle) => (
          <>
            <BattleCard battle={battle} />
            <BattleAnalysisPanel id={id} />
          </>
        )}
      </ResourceGate>
    </div>
  );
};
