'use client';

import { QueryState } from '@/ui-kit';

import { useTanksTab } from '../../../model/hooks';
import { TanksTable } from '../TanksTable';
import { TanksFilters } from './components';

import s from './TanksTab.module.scss';

export const TanksTab = () => {
  const { query, rows, total } = useTanksTab();

  return (
    <div className={s.root}>
      <TanksFilters total={total} />
      <QueryState query={query} skeleton={<TanksTable isLoading rows={rows} />}>
        <TanksTable rows={rows} />
      </QueryState>
    </div>
  );
};
