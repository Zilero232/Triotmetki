'use client';

import type { MoeRow } from '@otmetki/schemas';

import { useQuery } from '@tanstack/react-query';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

import { listMoe } from '@/entities/player/marks';
import { QUERY_KEYS } from '@/shared/constants';
import { statValueText } from '@/shared/lib';

import { HOME } from '../../../config';

export const useMarksMovement = () => {
  const t = useTranslations('home.marks');
  const format = useFormatter();
  const locale = useLocale();
  const params = { sort: HOME.marks.sort, order: HOME.marks.order, limit: HOME.marks.limit };

  const query = useQuery({
    queryKey: QUERY_KEYS.marks.list(params),
    queryFn: ({ signal }) => listMoe({ ...params, signal }),
    select: ({ items }) => {
      const rows = items.filter((row) => row.moe !== null);

      return { rows, leaders: rows.slice(0, HOME.marks.highlights) };
    }
  });

  const moeText = (value: number | undefined) => statValueText({ value: value === undefined ? null : format.number(value), locale });

  return {
    query,
    updatedAt: query.data?.rows[0]?.updatedAt ?? null,
    isEmpty: query.data?.rows.length === 0,
    leaderFigures: (row: MoeRow) => [
      { id: 'p95', label: t('threeMarks'), value: moeText(row.moe?.p95), delta: row.trend.p95Delta30d, isDeltaLowerBetter: true },
      { id: 'p65', label: t('oneMark'), value: moeText(row.moe?.p65) },
      { id: 'p85', label: t('twoMarks'), value: moeText(row.moe?.p85) }
    ]
  };
};
