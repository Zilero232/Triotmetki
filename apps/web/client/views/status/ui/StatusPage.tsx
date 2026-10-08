'use client';

import { HeartPulse } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DataSourceNote, ErrorState, PageHero, SectionHeader, Skeleton } from '@/ui-kit';

import { STATUS_PAGE } from '../config';
import { useStatusPage } from '../model/hooks';
import { CollectorJobs, QueueBacklog, StatusComponent, StatusVerdict } from './components';

import s from './StatusPage.module.scss';

export const StatusPage = () => {
  const t = useTranslations('status.page');
  const { summary, collector, isCollectorError, build, isPending, isFetching, checkedAt, onRefresh } = useStatusPage();

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <HeartPulse size={STATUS_PAGE.heroGlyph} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('title') }]}
        lead={t('lead')}
        title={t('title')}
      />
      <div className={s.body}>
        {isPending ? (
          <Skeleton className={s.verdictSkeleton} shape='block' />
        ) : (
          <StatusVerdict checkedAt={checkedAt} isFetching={isFetching} status={summary.status} verdict={summary.verdict} onRefresh={onRefresh} />
        )}
        <section className={s.section}>
          <SectionHeader as='h2' description={t('componentsLead')} title={t('componentsTitle')} />
          <ul className={s.grid}>
            {summary.components.map((component) => (
              <StatusComponent key={component.key} component={component} isPending={isPending} />
            ))}
          </ul>
        </section>
        {isPending && <Skeleton className={s.collectorSkeleton} shape='block' />}
        {isCollectorError && (
          <section className={s.section}>
            <SectionHeader as='h2' description={t('collector.lead')} title={t('collector.title')} />
            <ErrorState isCompact isRetrying={isFetching} onRetry={onRefresh} />
          </section>
        )}
        {collector && (
          <section className={s.section}>
            <SectionHeader as='h2' description={t('collector.lead')} title={t('collector.title')} />
            <CollectorJobs jobs={collector.jobs} lastModBattleAt={collector.lastModBattleAt} />
            <details className={s.details}>
              <summary className={s.detailsSummary}>{t('collector.queuesTitle')}</summary>
              <QueueBacklog collectedAt={collector.queuesCollectedAt} queues={collector.queues} />
            </details>
          </section>
        )}
        <section className={s.section}>
          <SectionHeader as='h2' title={t('sourcesTitle')} />
          <ul className={s.sources}>
            <li>{t('sources.lesta')}</li>
            <li>{t('sources.mod')}</li>
            <li>{t('sources.replays')}</li>
            <li>{t('sources.files')}</li>
          </ul>
        </section>
        {build && (
          <p className={s.build}>
            {build.commit ? t('buildWithCommit', { version: build.version, commit: build.commit }) : t('build', { version: build.version })}
          </p>
        )}
        <DataSourceNote />
      </div>
    </div>
  );
};
