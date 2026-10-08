import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { BlogPostEditorPage } from '@/views/blog-post-editor';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/blog/editor/[id]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const id = decodeRouteParam((await params).id);
  const t = await getTranslations({ locale, namespace: 'blog.editorMeta' });

  return createPageMetadata({ title: t('editTitle'), description: t('description'), path: ROUTES.blog.editor.edit(id), locale });
};

const BlogPostEditorRoute = async ({ params }: Pick<PageProps<'/[locale]/blog/editor/[id]'>, 'params'>) => {
  const { id } = await params;

  return <BlogPostEditorPage id={decodeRouteParam(id)} />;
};

const Page = ({ params }: PageProps<'/[locale]/blog/editor/[id]'>) => (
  <Suspense fallback={<PageHeaderFallback />}>
    <BlogPostEditorRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['blog'] });
