import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import type { TankCollectionPageProps } from '@/views/vehicle-catalog';

import { isTankCollection, TANK_COLLECTION_SLUGS } from '@/entities/tank/tank';
import { tankCollectionItems } from '@/entities/tank/tank/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { itemListJsonLd, JsonLd } from '@/shared/seo/json-ld';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { PageHeroFallback } from '@/ui-kit';
import { TankCollectionPage } from '@/views/vehicle-catalog';
import { vehicleCatalogPageState } from '@/views/vehicle-catalog/server';

export const generateStaticParams = () => TANK_COLLECTION_SLUGS.map((slug) => ({ slug }));

export const generateMetadata = async ({ params }: PageProps<'/[locale]/t/collections/[slug]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const { slug } = await params;
  const t = await getTranslations({ locale, namespace: 'vehicleCatalog' });

  if (!isTankCollection(slug)) {
    notFound();
  }

  return createPageMetadata({
    title: t(`collections.items.${slug}.title`),
    description: t(`collections.items.${slug}.description`),
    path: ROUTES.tanks.collection(slug),
    locale,
    index: true,
    follow: true
  });
};

const CollectionSchema = async ({ slug }: TankCollectionPageProps) => {
  const locale = resolveLocale(await rootParams.locale());
  const [t, items] = await Promise.all([getTranslations({ locale, namespace: 'vehicleCatalog' }), tankCollectionItems(slug)]);

  if (!items?.length) {
    return null;
  }

  return (
    <JsonLd
      data={itemListJsonLd({
        name: t(`collections.items.${slug}.title`),
        path: ROUTES.tanks.collection(slug),
        items: items.map((item) => ({ name: item.name, path: ROUTES.tanks.detail(item.slug) })),
        locale
      })}
    />
  );
};

const Page = async ({ params }: PageProps<'/[locale]/t/collections/[slug]'>) => {
  const { slug } = await params;

  if (!isTankCollection(slug)) {
    notFound();
  }

  return (
    <>
      <Suspense>
        <CollectionSchema slug={slug} />
      </Suspense>
      <Suspense fallback={<PageHeroFallback />}>
        <PrefetchBoundary state={vehicleCatalogPageState()}>
          <TankCollectionPage slug={slug} />
        </PrefetchBoundary>
      </Suspense>
    </>
  );
};

export default Page;
