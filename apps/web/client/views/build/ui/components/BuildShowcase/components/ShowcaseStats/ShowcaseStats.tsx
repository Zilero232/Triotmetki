'use client';

import { useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import { Skeleton, StatList } from '@/ui-kit';

import { useShowcaseStats } from '../../../../../model/hooks';

import s from './ShowcaseStats.module.scss';

export const ShowcaseStats = () => {
  const t = useTranslations('builds.showcase.stats');
  const { items, hasStats, isPending } = useShowcaseStats();

  return match({ isPending, hasStats })
    .with({ isPending: true }, () => <Skeleton height={252} />)
    .with({ hasStats: true }, () => <StatList columns={1} items={items} title={t('title')} />)
    .otherwise(() => <p className={s.empty}>{t('empty')}</p>);
};
