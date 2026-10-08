import type { JsonLdCrumb } from '@/shared/seo/json-ld';

import type { BreadcrumbCrumb, BreadcrumbTrailItem, WithHomeCrumbInput } from './breadcrumb-trail.types';

export const withHomeCrumb = ({ items, home }: WithHomeCrumbInput): BreadcrumbTrailItem[] => {
  const startsAtHome = items[0]?.href === home.href;

  return startsAtHome ? [...items] : [home, ...items];
};

export const breadcrumbTrail = (items: readonly BreadcrumbTrailItem[]): JsonLdCrumb[] | null => {
  if (items.length < 2 || !items.every(({ label }) => typeof label === 'string')) {
    return null;
  }

  return items.flatMap(({ label, href }, index) => (href || index === items.length - 1 ? [{ name: String(label), path: href }] : []));
};

export const breadcrumbCrumbs = (items: readonly BreadcrumbTrailItem[]): BreadcrumbCrumb[] =>
  items.map((item, depth) => ({ ...item, key: item.href ?? String(depth), isCurrent: depth === items.length - 1 }));
