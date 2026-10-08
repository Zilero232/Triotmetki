'use client';

import { useTranslations } from 'next-intl';

import { QueryState, SectionHeader, Skeleton } from '@/ui-kit';

import { useTelegramLinkPage } from '../model/hooks';
import { CodeRequest, LinkedPanel, MiniAppCard } from './components';

import s from './TelegramLinkPage.module.scss';

export const TelegramLinkPage = () => {
  const t = useTranslations('telegram.header');
  const { query, botUsername, code, issuedAt, isIssuing, onIssue } = useTelegramLinkPage();

  return (
    <div className={s.root}>
      <SectionHeader as='h1' description={t('description')} title={t('title')} />
      <div className={s.grid}>
        <QueryState query={query} skeleton={<Skeleton height={320} shape='block' />}>
          {(status) =>
            status.isLinked ? (
              <LinkedPanel botUsername={botUsername} username={status.username} />
            ) : (
              <CodeRequest botUsername={botUsername} code={code} isIssuing={isIssuing} issuedAt={issuedAt} onIssue={onIssue} />
            )
          }
        </QueryState>
        <MiniAppCard botUsername={botUsername} />
      </div>
    </div>
  );
};
