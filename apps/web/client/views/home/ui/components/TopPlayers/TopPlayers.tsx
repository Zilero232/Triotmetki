'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId } from 'react';

import { ROUTES } from '@/shared/constants';
import { Card, DataTable, EmptyState, Podium, PodiumCard, PodiumSkeleton, QueryState, SectionHeader, SegmentedControl } from '@/ui-kit';

import { HOME } from '../../../config';
import { useTopPlayerColumns, useTopPlayers } from '../../../model/hooks';

import s from './TopPlayers.module.scss';

export const TopPlayers = () => {
  const t = useTranslations('home.topPlayers');
  const format = useFormatter();
  const titleId = useId();
  const { metric, metricLabel, metricOptions, setMetric, query } = useTopPlayers();
  const columns = useTopPlayerColumns(metric);

  return (
    <section aria-labelledby={titleId} className={s.root}>
      <SectionHeader
        action={<SegmentedControl aria-label={t('metric')} options={metricOptions} size='sm' value={metric} onChange={setMetric} />}
        id={titleId}
        meta={t('period')}
        more={{ href: ROUTES.top, label: t('all') }}
        title={t('title')}
        variant='display'
      />
      <QueryState
        isCompact
        skeleton={
          <>
            <PodiumSkeleton count={HOME.topPlayers.podium} height={HOME.topPlayers.skeletonHeight} />
            <Card padding='none'>
              <DataTable isLoading columns={columns} data={[]} />
            </Card>
          </>
        }
        empty={<EmptyState isCompact isFramed title={t('empty')} />}
        isEmpty={({ podium }) => podium.length === 0}
        query={query}
      >
        {({ podium, rest }) => (
          <>
            <Podium aria-label={t('title')}>
              {podium.map(({ entry, name, tone }) => (
                <PodiumCard
                  key={`${entry.rank}-${entry.name}`}
                  href={ROUTES.players.profile(entry.name)}
                  meta={t('battles', { count: entry.battles })}
                  metricLabel={metricLabel}
                  name={name}
                  rank={entry.rank}
                  rankLabel={t('rank', { rank: entry.rank })}
                  tone={tone}
                  value={format.number(entry.value, 'integer')}
                />
              ))}
            </Podium>
            {rest.length > 0 && (
              <Card padding='none'>
                <DataTable
                  caption={t('title')}
                  columns={columns}
                  data={rest}
                  getRowId={(entry) => `${entry.rank}-${entry.name}`}
                  getRowLink={(entry) => ({ href: ROUTES.players.profile(entry.name), label: entry.name, hasCellLink: true })}
                />
              </Card>
            )}
          </>
        )}
      </QueryState>
    </section>
  );
};
