import type { BreadcrumbTrailItem } from '@/shared/lib';

export type PageBreadcrumb = BreadcrumbTrailItem;

export type BreadcrumbsProps = {
  items: PageBreadcrumb[];
  isCurrentAccent?: boolean;
  withSchema?: boolean;
  className?: string;
};
