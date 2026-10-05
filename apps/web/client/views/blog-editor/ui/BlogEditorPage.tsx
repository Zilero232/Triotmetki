'use client';

import { NotebookPen, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BlogEditorGate } from '@/features/blog/editor-access';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, PageHeader } from '@/ui-kit';

import { EditorPostList } from './components';

import s from './BlogEditorPage.module.scss';

export const BlogEditorPage = () => {
  const t = useTranslations('blog.editor.list');

  return (
    <div className={s.root}>
      <PageHeader
        actions={
          <Link className={buttonVariants({ size: 'sm' })} href={ROUTES.blog.editor.create}>
            <Plus aria-hidden size={14} />
            {t('create')}
          </Link>
        }
        breadcrumbs={[{ label: t('breadcrumb'), href: ROUTES.blog.list }, { label: t('title') }]}
        description={t('description')}
        emblem={<NotebookPen />}
        title={t('title')}
      />
      <BlogEditorGate>
        <EditorPostList />
      </BlogEditorGate>
    </div>
  );
};
