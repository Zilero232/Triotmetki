import { HeavyTankIcon } from '@otmetki/icons';
import { LayoutGrid } from 'lucide-react';

import { ROUTES } from '@/shared/constants';

export const TANKS_HUB_TABS = [
  { key: 'stats', href: ROUTES.tanks.list, icon: HeavyTankIcon },
  { key: 'catalog', href: ROUTES.tanks.catalog, icon: LayoutGrid }
] as const;

export const TANKS_HUB_NAV = {
  iconSize: 16
} as const;
