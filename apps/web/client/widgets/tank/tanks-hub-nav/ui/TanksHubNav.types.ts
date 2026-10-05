import type { TANKS_HUB_TABS } from '../config';

export type TanksHubSection = (typeof TANKS_HUB_TABS)[number]['key'];

export type TanksHubNavProps = {
  current: TanksHubSection;
};
