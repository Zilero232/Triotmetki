'use client';

import type { RatingPeriod } from '@otmetki/schemas';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ROUTES } from '@/shared/constants';
import { MOTION_VARIANTS } from '@/shared/lib';
import { Card, CardHeader, EmptyState, PageHeader, QueryState, SegmentedControl } from '@/ui-kit';

import { useComparePage } from '../model/hooks';
import { AddSlot, CompareTable, PlayerSlot } from './components';

import s from './ComparePlayersPage.module.scss';

export const ComparePlayersPage = () => {
  const t = useTranslations('compare');
  const tNav = useTranslations('nav');
  const titleId = useId();
  const tPeriods = useTranslations('periods');
  const { ids, period, setPeriod, periodOptions, canAdd, add, remove, query, isIdle, isMissing } = useComparePage();

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumbs={[{ label: tNav('items.players'), href: ROUTES.players.list }, { label: t('title') }]}
        description={t('description')}
        title={t('title')}
      >
        <div className={s.slots}>
          <AnimatePresence initial={false} mode='popLayout'>
            {ids.map((id, index) => (
              <m.div layout key={id} animate='shown' className={s.slot} exit='exit' initial='hidden' variants={MOTION_VARIANTS.listItem}>
                <PlayerSlot accountId={id} index={index} onRemove={() => remove(id)} />
              </m.div>
            ))}
            {canAdd && (
              <m.div layout key='add' animate='shown' className={s.slot} exit='exit' initial='hidden' variants={MOTION_VARIANTS.listItem}>
                <AddSlot excludeIds={ids} index={ids.length} onAdd={add} />
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </PageHeader>
      <Card aria-labelledby={titleId} padding='none'>
        <CardHeader
          action={
            <SegmentedControl<RatingPeriod> aria-label={tPeriods('label')} options={periodOptions} size='sm' value={period} onChange={setPeriod} />
          }
          title={<span id={titleId}>{t('caption')}</span>}
        />
        {isIdle || isMissing ? (
          <EmptyState isCompact title={isIdle ? t('emptyTitle') : t('missingTitle')} />
        ) : (
          <QueryState
            isCompact
            errorTitle={t('errorTitle')}
            query={query}
            skeleton={<CompareTable isLoading comparison={undefined} period={period} />}
          >
            {(comparison) => <CompareTable comparison={comparison} period={period} />}
          </QueryState>
        )}
      </Card>
    </div>
  );
};
