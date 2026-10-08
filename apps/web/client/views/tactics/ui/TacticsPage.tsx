'use client';

import { LayoutDashboard, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useLoginHref } from '@/entities/auth/session';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, EmptyState, PageHeader, QueryState, Skeleton } from '@/ui-kit';

import { useTacticsPage } from '../model/hooks';
import { BoardList, CreateBoardDialog } from './components';

import s from './TacticsPage.module.scss';

export const TacticsPage = () => {
  const loginHref = useLoginHref();
  const t = useTranslations('tactics.list');
  const { isGuest, isSignedIn, query } = useTacticsPage();

  return (
    <div className={s.root}>
      <PageHeader
        actions={isSignedIn && <CreateBoardDialog />}
        breadcrumbs={[{ label: t('title') }]}
        description={t('description')}
        title={t('title')}
      />
      {isGuest ? (
        <EmptyState
          action={
            <Link className={buttonVariants({ size: 'sm' })} href={loginHref}>
              <LogIn size={15} />
              {t('signIn')}
            </Link>
          }
          description={t('signInHint')}
          icon={<LogIn size={22} />}
          title={t('signInTitle')}
        />
      ) : (
        <QueryState
          empty={<EmptyState description={t('emptyHint')} icon={<LayoutDashboard size={22} />} title={t('empty')} />}
          query={query}
          skeleton={<Skeleton height={220} shape='block' />}
        >
          {(boards) => <BoardList boards={boards} />}
        </QueryState>
      )}
    </div>
  );
};
