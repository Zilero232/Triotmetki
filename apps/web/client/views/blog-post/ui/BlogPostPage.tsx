'use client';

import { useTranslations } from 'next-intl';

import { Markdown } from '@/features/community/markdown';
import { ROUTES } from '@/shared/constants';
import { Card, PageHeader } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { BlogPostPageProps } from './BlogPostPage.types';

import { useBlogArticle } from '../model/hooks';
import { ArticleHero, ArticleShare, ArticleTags, ArticleToc, BlogArticleProvider, BlogPostSkeleton, RelatedPosts } from './components';

import s from './BlogPostPage.module.scss';

export const BlogPostPage = ({ slug }: BlogPostPageProps) => {
  const t = useTranslations('blog.article');
  const tNav = useTranslations('nav.items');
  const query = useBlogArticle(slug);

  return (
    <div className={s.root}>
      <ResourceGate
        error={{ title: t('errorTitle'), description: t('errorDescription') }}
        header={<PageHeader breadcrumbs={[{ label: tNav('blog'), href: ROUTES.blog.list }, { label: slug }]} title={slug} />}
        query={query}
        skeleton={<BlogPostSkeleton />}
      >
        {(article) => (
          <BlogArticleProvider article={article}>
            <ArticleHero />
            <div className={s.layout}>
              <Card className={s.body} padding='lg'>
                <Markdown variant='article'>{article.post.body}</Markdown>
                <ArticleTags />
              </Card>
              <aside className={s.aside}>
                <ArticleToc />
                <ArticleShare />
              </aside>
            </div>
            <RelatedPosts />
          </BlogArticleProvider>
        )}
      </ResourceGate>
    </div>
  );
};
