import type { ReactNode } from 'react';

export type BreadcrumbTrailItem = {
  label: ReactNode;
  href?: string;
};

export type BreadcrumbCrumb = BreadcrumbTrailItem & {
  key: string;
  isCurrent: boolean;
};

export type WithHomeCrumbInput = {
  items: readonly BreadcrumbTrailItem[];
  home: BreadcrumbTrailItem & { href: string };
};
