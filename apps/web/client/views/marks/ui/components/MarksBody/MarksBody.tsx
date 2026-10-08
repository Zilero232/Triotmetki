'use client';

import { useTranslations } from 'next-intl';

import { Band, EmptyState, QueryState } from '@/ui-kit';

import { useMarksPage } from '../../../model/hooks';
import { ClosestMarks } from '../ClosestMarks';
import { ForecastLink } from '../ForecastLink';
import { MarksTable } from '../MarksTable';
import { MarksToolbar } from '../MarksToolbar';
import { MoeDrawer } from '../MoeDrawer';

import s from './MarksBody.module.scss';

export const MarksBody = () => {
  const t = useTranslations('marks.table');
  const tCommon = useTranslations('common');
  const { rows, pinnedIds, isPinPending, isUntracked, query, selected, isDrawerOpen, onSelect, onDrawerChange } = useMarksPage();

  return (
    <>
      <Band as='div' innerClassName={s.bandInner}>
        <ClosestMarks />
        <aside className={s.rail}>
          <ForecastLink />
        </aside>
      </Band>
      <section aria-label={t('title')} className={s.main}>
        <MarksToolbar />
        <QueryState
          empty={<EmptyState description={t('untrackedHint')} title={t('untracked')} />}
          errorTitle={t('error')}
          isEmpty={() => isUntracked}
          query={query}
          skeleton={<MarksTable isLoading rows={rows} onSelect={onSelect} />}
        >
          <MarksTable isLoading={isPinPending} isStale={query.isPlaceholderData} pinnedRowIds={pinnedIds} rows={rows} onSelect={onSelect} />
        </QueryState>
        <p className={s.source}>{tCommon('dataSource')}</p>
      </section>
      <MoeDrawer isOpen={isDrawerOpen} row={selected} onOpenChange={onDrawerChange} />
    </>
  );
};
