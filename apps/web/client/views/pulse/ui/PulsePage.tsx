'use client';

import { Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AreaChart, Card, CardHeader, DataSourceNote, EmptyState, KeyFigure, KeyFigures, PageHero, QueryState } from '@/ui-kit';
import { QueueNowCard } from '@/widgets/map/map-rotation';

import { usePulseView } from '../model/hooks';
import { HeatGrid, PulseSkeleton } from './components';

import s from './PulsePage.module.scss';

export const PulsePage = () => {
  const t = useTranslations('pulse');
  const view = usePulseView();

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <Activity size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('head.title') }]}
        lead={t('head.description')}
        title={t('head.title')}
      />
      <div className={s.content}>
        <QueryState
          empty={
            <>
              <Card>
                <EmptyState description={t('empty.description')} title={t('empty.title')} />
              </Card>
              <QueueNowCard />
            </>
          }
          errorDescription={t('error.description')}
          errorTitle={t('error.title')}
          isEmpty={(pulse) => pulse.trackedPlayers === 0}
          query={view.query}
          skeleton={<PulseSkeleton />}
        >
          {(pulse) => (
            <>
              <KeyFigures isFramed>
                <KeyFigure hint={t('figures.activeHint')} label={t('figures.active')} value={pulse.activePlayers} />
                <KeyFigure hint={t('figures.trackedHint')} label={t('figures.tracked')} value={pulse.trackedPlayers} />
                <KeyFigure hint={t('figures.peakHint', { zone: view.zone })} label={t('figures.peak')} suffix=':00' value={view.peakHour} />
                <KeyFigure format={{ maximumFractionDigits: 1 }} label={t('figures.peakShare')} suffix='%' value={view.peakShare} />
              </KeyFigures>
              <Card padding='none'>
                <CardHeader meta={t('heat.meta', { zone: view.zone })} title={t('heat.title')} />
                {view.heat.total === 0 ? <EmptyState isCompact title={t('heat.empty')} /> : <HeatGrid rows={view.heat.rows} />}
              </Card>
              <QueueNowCard />
              <Card padding='none'>
                <CardHeader meta={t('series.meta')} title={t('series.title')} />
                {view.series.values.length > 1 ? (
                  <div className={s.chart}>
                    <AreaChart
                      ariaLabel={t('series.title')}
                      height={220}
                      labels={view.series.labels}
                      series={[{ id: 'players', label: t('series.players'), values: view.series.values, tone: 'accent' }]}
                    />
                  </div>
                ) : (
                  <EmptyState isCompact title={t('series.empty')} />
                )}
              </Card>
              <DataSourceNote updatedAt={pulse.computedAt} />
            </>
          )}
        </QueryState>
      </div>
    </div>
  );
};
