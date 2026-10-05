'use client';

import { LogIn, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useLoginHref } from '@/entities/auth/session';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, EmptyState, Skeleton } from '@/ui-kit';

import type { BlogEditorGateProps } from './BlogEditorGate.types';

import { BLOG_ACCESS } from '../../config';
import { useBlogEditorAccess } from '../../model/hooks';

export const BlogEditorGate = ({ children }: BlogEditorGateProps) => {
  const loginHref = useLoginHref();
  const t = useTranslations('blog.editor.gate');
  const { isPending, isSignedIn, canEdit } = useBlogEditorAccess();

  if (isPending) {
    return <Skeleton height={BLOG_ACCESS.skeletonHeight} shape='block' />;
  }

  if (!isSignedIn) {
    return (
      <EmptyState
        action={
          <Link className={buttonVariants({ size: 'sm' })} href={loginHref}>
            <LogIn aria-hidden size={14} />
            {t('signIn')}
          </Link>
        }
        description={t('signInDescription')}
        icon={<LogIn />}
        title={t('signInTitle')}
      />
    );
  }

  return canEdit ? children : <EmptyState description={t('forbiddenDescription')} icon={<ShieldAlert />} title={t('forbiddenTitle')} />;
};
