'use client';

import { Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Badge, IconButton, ProgressBar } from '@/ui-kit';

import type { GoalItemProps } from './GoalItem.types';

import { GOAL_STATUS_TONE } from '../../../config';
import { useGoalItem } from '../../../model/hooks';

import s from './GoalItem.module.scss';

export const GoalItem = ({ goal, onRemove }: GoalItemProps) => {
  const t = useTranslations('me.goals');
  const format = useFormatter();
  const { progress, tankName, daysLeft, formatValue: value } = useGoalItem(goal);

  const { metric, target, baseline, current, status } = goal;

  return (
    <article className={s.root} data-status={status}>
      <div className={s.head}>
        <strong className={s.title}>
          {tankName === null
            ? t('goalTitle', { metric: t(`metric.${metric}`), target: value(target) })
            : t('goalTitleTank', { metric: t(`metric.${metric}`), tank: tankName, target: value(target) })}
        </strong>
        <Badge tone={GOAL_STATUS_TONE[status]}>{t(`status.${status}`)}</Badge>
        <IconButton aria-label={t('remove')} size='sm' onClick={onRemove}>
          <Trash2 size={14} />
        </IconButton>
      </div>
      <ProgressBar
        label={t('progress', { from: value(baseline), current: current === null ? '—' : value(current) })}
        tone={status === 'achieved' ? 'good' : 'accent'}
        value={progress * 100}
        valueLabel={format.number(progress, 'share')}
      />
      <span className={s.rule}>{t(`rule.${metric}`)}</span>
      {daysLeft !== null && <span className={s.deadline}>{daysLeft >= 0 ? t('daysLeft', { count: daysLeft }) : t('overdue')}</span>}
    </article>
  );
};
