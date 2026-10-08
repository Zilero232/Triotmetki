import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { env } from '@/shared/config';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { BlogPage, blogRssHref } from '@/views/blog';

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'blog.meta' });
  const metadata = createPageMetadata({
    title: t('title'),
    description: t('description'),
    path: ROUTES.blog.list,
    locale,
    index: true,
    follow: true
  });

  return {
    ...metadata,
    alternates: { ...metadata.alternates, types: { 'application/rss+xml': blogRssHref(env.NEXT_PUBLIC_API_URL) } }
  };
};

const Page = () => (
  <Suspense fallback={<PageHeaderFallback />}>
    <BlogPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['blog'] });
