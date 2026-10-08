import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { BillingPage } from '@/views/billing';

export const instant = false;

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'billing.meta' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });

  return createPageMetadata({ title: t('title'), description: t('description', { plus: tBrand('plus') }), path: ROUTES.account.billing, locale });
};

const Page = () => (
  <Suspense>
    <BillingPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['billing', 'plus.teaser'] });
