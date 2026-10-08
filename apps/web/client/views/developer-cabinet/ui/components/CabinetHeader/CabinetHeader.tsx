'use client';

import { API_KEY } from '@otmetki/schemas';
import { BookOpen } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, SectionHeader, Skeleton } from '@/ui-kit';

import { useDeveloperOverview } from '../../../model/hooks';

import s from './CabinetHeader.module.scss';

export const CabinetHeader = () => {
  const t = useTranslations('developer.header');
  const tTier = useTranslations('developer.tierName');
  const format = useFormatter();
  const { data: overview, isError } = useDeveloperOverview();

  const readouts =
    overview &&
    ([
      { key: 'perDay', value: format.number(overview.limits.requestsPerDay) },
      { key: 'perSecond', value: format.number(overview.limits.requestsPerSecond) },
      { key: 'keys', value: `${overview.keys.length} / ${API_KEY.maxActivePerUser}` },
      { key: 'webhooks', value: `${overview.webhooks} / ${overview.limits.webhooks}` }
    ] as const);

  return (
    <div className={s.root}>
      <SectionHeader
        action={
          <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} href={ROUTES.developers}>
            <BookOpen size={15} />
            {t('docs')}
          </Link>
        }
        as='h1'
        description={t('lead')}
        meta={t('eyebrow')}
        title={t('title')}
      />
      <div className={s.tag}>
        <span className={s.tagLabel}>{t('tier')}</span>
        {overview && <span className={s.tier}>{tTier(overview.tier)}</span>}
        {!overview && isError && <span className={s.tier}>—</span>}
        {!overview && !isError && <Skeleton height={40} shape='block' width={120} />}
        <dl className={s.readouts}>
          {readouts?.map(({ key, value }) => (
            <div key={key} className={s.readout}>
              <dt className={s.readoutLabel}>{t(`readouts.${key}`)}</dt>
              <dd className={s.readoutValue}>{value}</dd>
            </div>
          ))}
        </dl>
        {overview?.tier === 'free' && (
          <Link className={s.upsell} href={ROUTES.plus}>
            {t('upsell')}
          </Link>
        )}
      </div>
    </div>
  );
};
