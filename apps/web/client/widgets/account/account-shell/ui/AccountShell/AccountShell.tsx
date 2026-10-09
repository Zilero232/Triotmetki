'use client';

import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import { useLoginHref } from '@/entities/auth/session';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, EmptyState, ErrorState, SkeletonStack } from '@/ui-kit';

import type { AccountShellProps } from './AccountShell.types';

import { ACCOUNT_SHELL } from '../../config';
import { useAccountShell } from '../../model/hooks';
import { AccountNav } from './components';

import s from './AccountShell.module.scss';

export const AccountShell = ({ children }: AccountShellProps) => {
  const loginHref = useLoginHref();
  const t = useTranslations('me');
  const { state, section, isRetrying, retry } = useAccountShell();

  return (
    <div className={s.root}>
      {match(state)
        .with({ isPending: true }, () => <SkeletonStack className={s.skeleton} heights={ACCOUNT_SHELL.skeletonHeights} />)
        .with({ isFailed: true }, () => <ErrorState isRetrying={isRetrying} onRetry={retry} />)
        .with({ isSignedIn: false }, () => (
          <EmptyState
            isFramed
            action={
              <Link className={buttonVariants({ variant: 'primary' })} href={loginHref}>
                <LogIn size={14} />
                {t('signIn')}
              </Link>
            }
            className={s.guest}
            description={t(`guest.${section.key}.description`)}
            icon={<section.icon aria-hidden size={28} />}
            title={t(`guest.${section.key}.title`)}
            titleAs='h1'
          />
        ))
        .otherwise(() => (
          <div className={s.layout}>
            <AccountNav />
            <div className={s.content}>{children}</div>
          </div>
        ))}
    </div>
  );
};
