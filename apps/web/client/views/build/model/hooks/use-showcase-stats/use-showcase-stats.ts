'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { StatListItem } from '@/ui-kit';

import { TANK_DETAIL } from '@/entities/tank/tank';

import { buildQueries } from '../../../api';
import { SHOWCASE } from '../../../config';
import { useBuildContext } from '../../context';

export const useShowcaseStats = () => {
  const t = useTranslations('builds.showcase.stats');
  const { vehicle } = useBuildContext();
  const { data: detail, isPending } = useQuery(buildQueries.tank({ idOrSlug: vehicle.slug, period: TANK_DETAIL.period }));

  const row =
    detail?.serverStats.find(({ cohort, mode }) => cohort === SHOWCASE.statsCohort && mode === SHOWCASE.statsMode) ?? detail?.serverStats[0] ?? null;

  const items: StatListItem[] = [
    { id: 'winRate', label: t('winRate'), value: row?.winRate, kind: 'percent', isHighlighted: true },
    { id: 'avgFrags', label: t('avgFrags'), value: row?.avgFrags, kind: 'decimal' },
    { id: 'avgDamage', label: t('avgDamage'), value: row?.avgDamage },
    { id: 'avgSpotted', label: t('avgSpotted'), value: row?.avgSpotted, kind: 'decimal' },
    { id: 'master', label: t('master'), value: detail?.mastery?.master, suffix: t('xp') },
    { id: 'avgBlocked', label: t('avgBlocked'), value: row?.avgBlocked },
    { id: 'threeMarks', label: t('threeMarks'), value: detail?.moe?.p95 },
    { id: 'accuracy', label: t('accuracy'), value: row?.accuracy, kind: 'percent' }
  ];

  return { items, hasStats: row !== null, isPending };
};
