'use client';

import { useQuery } from '@tanstack/react-query';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { shopControllerListBonusCodesOptions } from '@/shared/api/query-options';
import { useClientNow } from '@/shared/lib';

import type { CodesTab } from './use-bonus-codes.types';

import { CODES } from '../../../config';
import { codeGroups } from '../../../lib/code-groups';
import { expiringCount } from '../../../lib/code-ribbon';

export const useBonusCodes = () => {
  const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(CODES.tabs).withDefault('active').withOptions({ history: 'replace' }));
  const query = useQuery({ ...shopControllerListBonusCodesOptions(), staleTime: CODES.staleMs, select: codeGroups });
  const now = useClientNow({ updateInterval: CODES.clockMs });

  return {
    tab,
    query,
    figures: query.data && query.data.active.length + query.data.expired.length > 0 ? query.data : null,
    hasFigures: query.isPending || query.isError || Boolean(query.data && query.data.active.length + query.data.expired.length > 0),
    activeCount: query.data ? query.data.active.length : null,
    expiringCount: expiringCount({ codes: query.data?.active ?? [], now, expiringDays: CODES.expiringDays }),
    setTab: (next: CodesTab) => void setTab(next)
  };
};
