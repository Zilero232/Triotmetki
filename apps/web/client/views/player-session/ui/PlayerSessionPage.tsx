'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Card, PageHeader, Skeleton } from '@/ui-kit';
import { SessionDetail } from '@/widgets/player/session-detail';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { PlayerSessionPageProps } from './PlayerSessionPage.types';

import { useSessionPage } from '../model/hooks';

import s from './PlayerSessionPage.module.scss';

export const PlayerSessionPage = ({ nickname, sessionId }: PlayerSessionPageProps) => {
  const t = useTranslations('profile.sessions');
  const tPlayers = useTranslations('players.head');
  const query = useSessionPage(nickname);

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumbs={[
          { label: tPlayers('title'), href: ROUTES.players.list },
          { label: nickname, href: ROUTES.players.profile(nickname) },
          { label: t('eyebrow') }
        ]}
        title={t('meta.title', { nickname })}
      />
      <Card padding='lg'>
        <ResourceGate error={{ title: t('errorTitle') }} query={query} skeleton={<Skeleton height={360} shape='block' />}>
          {({ summary }) => <SessionDetail accountId={summary.accountId} nickname={summary.nickname} sessionId={sessionId} />}
        </ResourceGate>
      </Card>
    </div>
  );
};
