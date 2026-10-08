import { useLocale, useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { breadcrumbJsonLd } from '@/shared/seo/json-ld';

import type { BreadcrumbTrailItem } from '../breadcrumb-trail';

import { breadcrumbCrumbs, breadcrumbTrail, withHomeCrumb } from '../breadcrumb-trail';

export const useBreadcrumbs = (items: readonly BreadcrumbTrailItem[]) => {
  const t = useTranslations('common');
  const locale = resolveLocale(useLocale());

  const fullTrail = withHomeCrumb({ items, home: { label: t('home'), href: ROUTES.home } });
  const trail = breadcrumbTrail(fullTrail);

  return {
    crumbs: breadcrumbCrumbs(fullTrail),
    jsonLd: trail ? breadcrumbJsonLd({ items: trail, locale }) : null
  };
};
