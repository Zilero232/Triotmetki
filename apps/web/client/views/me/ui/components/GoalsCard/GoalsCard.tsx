'use client';

import { Target } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { QueryState, Skeleton } from '@/ui-kit';

import { CARD_SKELETON } from '../../../config';
import { useGoalsCard } from '../../../model/hooks';
import { GoalForm } from '../GoalForm';
import { GoalItem } from '../GoalItem';
import { MeCard } from '../MeCard';
import { SectionError } from '../SectionError';

import s from './GoalsCard.module.scss';

export const GoalsCard = () => {
  const t = useTranslations('me.goals');
  const { query, isRetrying, onRetry, onRemove } = useGoalsCard();

  return (
    <MeCard description={t('description')} icon={<Target size={18} />} title={t('title')}>
      <div className={s.root}>
        <div className={s.list}>
          <QueryState
            skeleton={
              <div className={s.list}>
                <Skeleton count={CARD_SKELETON.goals.rows} height={CARD_SKELETON.goals.height} shape='block' />
              </div>
            }
            empty={<p className={s.empty}>{t('empty')}</p>}
            errorState={<SectionError isRetrying={isRetrying} onRetry={onRetry} />}
            query={query}
          >
            {(goals) => goals.map((goal, index) => <GoalItem key={goal.id} goal={goal} index={index} onRemove={() => onRemove(goal.id)} />)}
          </QueryState>
        </div>
        <GoalForm />
      </div>
    </MeCard>
  );
};
