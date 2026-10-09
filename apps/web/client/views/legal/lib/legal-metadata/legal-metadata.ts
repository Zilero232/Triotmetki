import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';

import type { LEGAL_DOCS } from '../../config';

export const legalMetadata = async (doc: (typeof LEGAL_DOCS)[number]): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'legal.docs' });

  return createPageMetadata({
    title: t(`${doc}.title`),
    description: t(`${doc}.description`),
    path: ROUTES.legal[doc],
    locale,
    index: true,
    follow: true
  });
};
