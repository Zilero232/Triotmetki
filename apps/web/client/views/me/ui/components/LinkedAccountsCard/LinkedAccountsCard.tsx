'use client';

import { KeyRound, Send } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { useLinkedAccounts } from '@/entities/auth/session';
import { LestaIdButton } from '@/features/auth/lesta-link';
import { ROUTES } from '@/shared/constants';
import { Badge, QueryState, Skeleton } from '@/ui-kit';

import { CARD_SKELETON } from '../../../config';
import { MeCard } from '../MeCard';
import { SectionError } from '../SectionError';
import { LestaLinkError } from './components';

import s from './LinkedAccountsCard.module.scss';

export const LinkedAccountsCard = () => {
  const t = useTranslations('me.accounts');
  const format = useFormatter();
  const query = useLinkedAccounts();

  const { isFetching, refetch } = query;

  return (
    <MeCard description={t('description')} icon={<KeyRound size={18} />} title={t('title')}>
      <QueryState
        skeleton={
          <div className={s.list}>
            <Skeleton count={CARD_SKELETON.accounts.rows} height={CARD_SKELETON.accounts.height} shape='block' />
          </div>
        }
        errorState={<SectionError isRetrying={isFetching} onRetry={() => void refetch()} />}
        query={query}
      >
        {(accounts) => (
          <ul className={s.list}>
            {accounts.lesta.map(({ accountId, nickname, isPrimary, tokenExpiresAt, isStale }) => (
              <li key={accountId} className={s.row}>
                <span className={s.provider}>{t('lesta')}</span>
                <span className={s.name}>{nickname}</span>
                {isPrimary && <Badge tone='accent'>{t('primary')}</Badge>}
                {isStale && <Badge tone='warning'>{t('stale')}</Badge>}
                {tokenExpiresAt && !isStale && (
                  <span className={s.meta}>
                    {t('tokenUntil', { date: format.dateTime(new Date(tokenExpiresAt), { day: 'numeric', month: 'short' }) })}
                  </span>
                )}
              </li>
            ))}
            <li className={s.row}>
              <span className={s.provider}>
                <Send size={12} />
                {t('telegram')}
              </span>
              <span className={s.name}>{accounts.telegram ? `@${accounts.telegram.username ?? accounts.telegram.telegramId}` : t('notLinked')}</span>
            </li>
          </ul>
        )}
      </QueryState>
      <Suspense fallback={null}>
        <LestaLinkError />
      </Suspense>
      <LestaIdButton block callbackPath={ROUTES.account.overview} label={t('linkLesta')} variant='secondary' />
      <p className={s.note}>{t('note')}</p>
    </MeCard>
  );
};
