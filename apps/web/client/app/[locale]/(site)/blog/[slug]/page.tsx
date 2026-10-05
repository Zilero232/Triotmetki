import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { blogRouteMeta } from '@/entities/blog/post/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { articleJsonLd, breadcrumbJsonLd, JsonLd } from '@/shared/seo/json-ld';
import { requireRouteMeta } from '@/shared/seo/require-route-entity';
import { PageHeroFallback } from '@/ui-kit';
import { BlogPostPage } from '@/views/blog-post';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/blog/[slug]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const slug = decodeRouteParam((await params).slug);
  const t = await getTranslations({ locale, namespace: 'blog.detailMeta' });
  const meta = await requireRouteMeta(blogRouteMeta(slug));
  const metadata = createPageMetadata({
    title: meta?.seoTitle ?? t('title'),
    description: meta?.description ?? t('description'),
    path: ROUTES.blog.detail(slug),
    locale,
    index: meta !== null,
    follow: true,
    hasOwnImage: Boolean(meta?.cover),
    contentLocale: meta?.contentLocale
  });

  return meta?.cover
    ? {
        ...metadata,
        openGraph: { ...metadata.openGraph, type: 'article', images: [meta.cover], publishedTime: meta.publishedAt ?? undefined },
        twitter: { ...metadata.twitter, images: [meta.cover] }
      }
    : metadata;
};

const BlogArticleSchema = async ({ params }: Pick<PageProps<'/[locale]/blog/[slug]'>, 'params'>) => {
  const locale = resolveLocale(await rootParams.locale());
  const slug = decodeRouteParam((await params).slug);
  const t = await getTranslations({ locale, namespace: 'blog.article' });
  const { meta } = await blogRouteMeta(slug);
  const path = ROUTES.blog.detail(slug);

  return meta ? (
    <JsonLd
      data={[
        articleJsonLd({
          headline: meta.title,
          description: meta.description,
          path,
          locale: meta.contentLocale,
          image: meta.cover,
          datePublished: meta.publishedAt,
          dateModified: meta.updatedAt,
          authorName: meta.authorName
        }),
        breadcrumbJsonLd({ items: [{ name: t('breadcrumb'), path: ROUTES.blog.list }, { name: meta.title }], locale: meta.contentLocale })
      ]}
    />
  ) : null;
};

const BlogPostRoute = async ({ params }: Pick<PageProps<'/[locale]/blog/[slug]'>, 'params'>) => {
  const slug = decodeRouteParam((await params).slug);

  await requireRouteMeta(blogRouteMeta(slug));

  return <BlogPostPage slug={slug} />;
};

const Page = ({ params }: PageProps<'/[locale]/blog/[slug]'>) => (
  <>
    <Suspense>
      <BlogArticleSchema params={params} />
    </Suspense>
    <Suspense fallback={<PageHeroFallback />}>
      <BlogPostRoute params={params} />
    </Suspense>
  </>
);

export default Page;
