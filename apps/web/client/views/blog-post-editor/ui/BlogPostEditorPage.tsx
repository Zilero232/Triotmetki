'use client';

import { NotebookPen } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BlogEditorGate } from '@/features/blog/editor-access';
import { ROUTES } from '@/shared/constants';
import { PageHeader } from '@/ui-kit';

import type { BlogPostEditorPageProps } from './BlogPostEditorPage.types';

import { EditorPostLoader } from './components';

import s from './BlogPostEditorPage.module.scss';

export const BlogPostEditorPage = ({ id }: BlogPostEditorPageProps) => {
  const t = useTranslations('blog.editor.form');

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumbs={[
          { label: t('breadcrumbBlog'), href: ROUTES.blog.list },
          { label: t('breadcrumbEditor'), href: ROUTES.blog.editor.list },
          { label: id ? t('editTitle') : t('newTitle') }
        ]}
        description={t('description')}
        emblem={<NotebookPen />}
        title={id ? t('editTitle') : t('newTitle')}
      />
      <BlogEditorGate>
        <EditorPostLoader id={id} />
      </BlogEditorGate>
    </div>
  );
};
