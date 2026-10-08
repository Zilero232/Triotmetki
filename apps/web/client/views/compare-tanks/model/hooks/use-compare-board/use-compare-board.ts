'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { specsOfFlat, useSpecFormat } from '@/entities/tank/tank';

import type { CompareStatKey } from '../../../config';
import type { BoardSection } from './use-compare-board.types';

import { COMPARE_STAT_FORMAT, COMPARE_STAT_VALUE, COMPARE_STATS } from '../../../config';
import { compareRow, specSections } from '../../../lib/compare-rows';
import { useCompareIds } from '../use-compare-ids';
import { useComparison } from '../use-comparison';

export const useCompareBoard = () => {
  const t = useTranslations('tanks.compare.board');
  const tTank = useTranslations('tank');
  const format = useFormatter();
  const spec = useSpecFormat();
  const { ids, vehicles, statsOf, isStatsLoading, isStatsErrorOf, retryStatsOf, isLoading, isError, isFetching, refetch } = useComparison();
  const { clear, remove } = useCompareIds();

  const statUnit: Record<CompareStatKey, string> = { winRate: '%', winRateDiff: tTank('stats.pp'), avgDamage: '', battles: '' };

  const stats = vehicles.map(({ vehicle }) => statsOf(vehicle.tankId));

  const statsSection: BoardSection = {
    id: 'stats',
    title: t('stats'),
    isLoading: isStatsLoading,
    rows: COMPARE_STATS.map((key) => ({
      key,
      label: t(`statsKeys.${key}`),
      unit: statUnit[key],
      cells: compareRow({ key, values: stats.map((row) => (row ? COMPARE_STAT_VALUE[key](row) : null)) }).map((cell) => ({
        ...cell,
        display: cell.value === null ? '—' : format.number(cell.value, COMPARE_STAT_FORMAT[key])
      }))
    }))
  };

  const specSectionsList: BoardSection[] = specSections({ specs: vehicles.map(({ specs }) => specsOfFlat(specs)) }).map(({ group, rows }) => ({
    id: group,
    title: tTank(`specGroups.${group}`),
    isLoading: false,
    rows: rows.map(({ key, cells }) => ({
      key,
      label: spec.label(key),
      unit: spec.unit(key),
      cells: cells.map((cell) => ({ ...cell, display: spec.value({ key, value: cell.value }) }))
    }))
  }));

  return {
    count: ids.length,
    sections: [statsSection, ...specSectionsList],
    query: {
      data: isLoading || isError ? undefined : vehicles.map(({ vehicle }) => vehicle),
      isError,
      isRefetching: isFetching,
      refetch
    },
    isStatsErrorOf,
    onRetryStats: retryStatsOf,
    onClear: clear,
    onRemove: remove
  };
};
