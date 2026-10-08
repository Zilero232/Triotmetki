'use client';

import { Dices } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Band, DataSourceNote, EmptyState, KeyFigure, PageHero, QueryState, SegmentedControl, TierNumeral } from '@/ui-kit';

import { useHonestRngPage } from '../model/hooks';
import { MyRngPanel, RngHistogram, RngScopeTable, RngSkeleton } from './components';

import s from './HonestRngPage.module.scss';

export const HonestRngPage = () => {
  const t = useTranslations('honestRng');
  const rng = useHonestRngPage();

  return (
    <div className={s.root}>
      <PageHero
        figures={
          rng.hasFigures && (
            <>
              <KeyFigure label={t('head.shots')} value={rng.server?.shots} variant='compact' />
              <KeyFigure
                format={{ signDisplay: 'exceptZero', maximumFractionDigits: 2 }}
                label={t('head.meanRoll')}
                suffix='%'
                value={rng.meanRoll}
                variant='compact'
              />
              <KeyFigure
                format={{ maximumFractionDigits: 1 }}
                label={t('head.within')}
                suffix='%'
                value={rng.server?.withinSpread}
                variant='compact'
              />
            </>
          )
        }
        art={{ kind: 'emblem', glyph: <Dices size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('head.title') }]}
        lead={t('head.lead')}
        title={t('head.title')}
      />
      <div className={s.body}>
        <SegmentedControl aria-label={t('period.label')} options={rng.periods} value={rng.period} onChange={rng.setPeriod} />
        <QueryState
          empty={<EmptyState description={t('empty.description')} title={t('empty.title')} />}
          errorDescription={t('error.description')}
          errorTitle={t('error.title')}
          isEmpty={({ server }) => server === null || server.shots === 0}
          query={rng.query}
          skeleton={<RngSkeleton />}
        >
          <RngHistogram
            formatValue={rng.formatPercent}
            labels={rng.chart.labels}
            meta={t('server.meta')}
            series={rng.chart.series}
            title={t('server.title')}
          />
          <div className={s.pair}>
            <RngScopeTable
              rows={rng.tiers.map((row) => ({ ...row, label: <TierNumeral tier={row.tier} variant='hex' /> }))}
              scopeLabel={t('columns.tier')}
              title={t('breakdown.tiers')}
            />
            <RngScopeTable
              rows={rng.shells.map((row) => ({ ...row, label: t(`shells.${row.shell}`) }))}
              scopeLabel={t('columns.shell')}
              title={t('breakdown.shells')}
            />
          </div>
        </QueryState>
        <MyRngPanel />
      </div>
      <Band tone='deep'>
        <div className={s.method}>
          <h2 className={s.methodTitle}>{t('method.title')}</h2>
          <p>{t('method.data')}</p>
          <p>{t('method.theory')}</p>
          <p>{t('method.fairPlay')}</p>
        </div>
      </Band>
      <div className={s.body}>
        <DataSourceNote updatedAt={rng.query.data?.computedAt ?? null} />
      </div>
    </div>
  );
};
