import type { ComponentType } from 'react';

import type { SITE_FOOTER_ACTION_KEYS, SITE_LINKS, SITE_NAV_GROUPS } from './site-nav';

type SiteNavIconProps = {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
};

export type SiteNavIcon = ComponentType<SiteNavIconProps>;

type SiteNavFeatured = 'currentEvent' | 'liveStreamers' | 'topTank';

export type SiteNavLink = {
  key: string;
  href: string;
  icon: SiteNavIcon;
};

export type SiteNavGroup = {
  key: string;
  featured: SiteNavFeatured | null;
  items: readonly SiteNavLink[];
};

export type SiteNavItem = (typeof SITE_LINKS)[keyof typeof SITE_LINKS];

export type SiteNavGroupEntry = (typeof SITE_NAV_GROUPS)[number];

export type SiteFooterAction = Extract<SiteNavItem, { key: (typeof SITE_FOOTER_ACTION_KEYS)[number] }>;
