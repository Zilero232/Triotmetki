'use client';

import { useTranslations } from 'next-intl';

import { RelativeTime } from '@/ui-kit';

import type { CollectorJobsProps } from './CollectorJobs.types';

import s from './CollectorJobs.module.scss';

export const CollectorJobs = ({ jobs, lastModBattleAt }: CollectorJobsProps) => {
  const t = useTranslations('status.page.collector');

  return (
    <dl className={s.root}>
      {jobs.map(({ job, lastSuccessAt, version }) => (
        <div key={job} className={s.row}>
          <dt className={s.name}>{t(`jobs.${job}`)}</dt>
          <dd className={s.value} data-fresh={Boolean(lastSuccessAt)}>
            {lastSuccessAt ? (
              <>
                {t(`updated.${job}`)} <RelativeTime value={lastSuccessAt} />
              </>
            ) : (
              t('never')
            )}
            {version && <span className={s.version}>{t('version', { version })}</span>}
          </dd>
        </div>
      ))}
      <div className={s.row}>
        <dt className={s.name}>{t('lastModBattle')}</dt>
        <dd className={s.value} data-fresh={Boolean(lastModBattleAt)}>
          {lastModBattleAt ? (
            <>
              {t('updated.lastModBattle')} <RelativeTime value={lastModBattleAt} />
            </>
          ) : (
            t('never')
          )}
        </dd>
      </div>
    </dl>
  );
};
