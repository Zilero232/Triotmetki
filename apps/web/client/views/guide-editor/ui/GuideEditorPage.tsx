'use client';

import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { match } from 'ts-pattern';

import { useLoginHref } from '@/entities/auth/session';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, EmptyState, ErrorState, PageHeader, SkeletonStack } from '@/ui-kit';

import type { GuideEditorPageProps } from './GuideEditorPage.types';

import { GUIDE_FORM } from '../config';
import { useGuideEditorPage } from '../model/hooks';
import { GuideEditorForm } from './components';

import s from './GuideEditorPage.module.scss';

export const GuideEditorPage = ({ slug }: GuideEditorPageProps) => {
  const loginHref = useLoginHref();
  const t = useTranslations('guides.editor');
  const { isEdit, isSessionPending, isSignedIn, guide, isGuidePending, isNotFound, isError, isForeign, isRetrying, retry } = useGuideEditorPage(slug);

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumbs={[
          { label: t('breadcrumb'), href: ROUTES.guides.list },
          ...(guide ? [{ label: guide.title, href: ROUTES.guides.detail(guide.slug) }] : []),
          { label: isEdit ? t('editTitle') : t('newTitle') }
        ]}
        description={t('description')}
        title={isEdit ? t('editTitle') : t('newTitle')}
      />
      {match({ isSessionPending, isSignedIn, isNotFound, isError, isGuidePending, isForeign })
        .with({ isSessionPending: true }, () => <SkeletonStack className={s.skeleton} heights={GUIDE_FORM.skeletonHeights} />)
        .with({ isSignedIn: false }, () => (
          <EmptyState
            action={
              <Link className={buttonVariants({ size: 'sm' })} href={loginHref}>
                <LogIn size={14} />
                {t('signIn')}
              </Link>
            }
            description={t('signInDescription')}
            title={t('signInTitle')}
          />
        ))
        .with({ isNotFound: true }, () => notFound())
        .with({ isError: true }, () => (
          <ErrorState description={t('loadErrorDescription')} isRetrying={isRetrying} title={t('loadErrorTitle')} onRetry={retry} />
        ))
        .with({ isGuidePending: true }, () => <SkeletonStack className={s.skeleton} heights={GUIDE_FORM.skeletonHeights} />)
        .with({ isForeign: true }, () => <EmptyState description={t('foreignDescription')} title={t('foreignTitle')} />)
        .otherwise(() => (
          <GuideEditorForm key={guide?.id ?? 'new'} guide={guide} />
        ))}
    </div>
  );
};
