'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { latestUpdate } from '../../../lib/moe-rows';
import { useMoeFeed } from '../use-moe-feed';

export const useMarksHeadStats = () => {
  const t = useTranslations('marks.head');
  const format = useFormatter();
  const { query, all, total, isUntracked } = useMoeFeed();

  const updatedAt = latestUpdate(all);
  const updated = updatedAt ? format.dateTime(new Date(updatedAt), { dateStyle: 'medium' }) : t('updatedUnknown');

  return {
    isHidden: isUntracked,
    stats: query.isPending ? null : { total, updated }
  };
};
