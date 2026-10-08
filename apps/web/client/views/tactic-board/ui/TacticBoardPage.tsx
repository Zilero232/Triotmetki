'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { PageHeader, PageHeaderSkeleton } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { TacticBoardPageProps } from './TacticBoardPage.types';

import { useTacticBoardPage } from '../model/hooks';
import { BoardHeader, BoardSkeleton, BoardWorkspace, SharePanel } from './components';

import s from './TacticBoardPage.module.scss';

export const TacticBoardPage = ({ id }: TacticBoardPageProps) => {
  const t = useTranslations('tactics.board');
  const tNav = useTranslations('nav.items');
  const tCommon = useTranslations('common');
  const { query, token } = useTacticBoardPage(id);

  return (
    <div className={s.root}>
      <ResourceGate
        skeleton={
          <>
            <PageHeaderSkeleton hasDescription={false} />
            <BoardSkeleton />
          </>
        }
        back={{ href: ROUTES.tactics.list, label: t('backToList') }}
        error={{ title: tCommon('loadErrorTitle'), description: tCommon('loadErrorDescription') }}
        header={<PageHeader breadcrumbs={[{ label: tNav('tactics'), href: ROUTES.tactics.list }]} title={tNav('tactics')} />}
        notFound={{ title: t('notFound'), description: t('notFoundHint') }}
        query={query}
      >
        {(board) => (
          <>
            <BoardHeader board={board} token={token} />
            {board.role === 'owner' && <SharePanel board={board} token={token} />}
            <BoardWorkspace key={board.id} board={board} urlToken={token} />
          </>
        )}
      </ResourceGate>
    </div>
  );
};
