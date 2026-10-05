import type { ReplayItem } from '@/entities/replay/replay';

export type SiteStateProps = {
  state: NonNullable<ReplayItem['site']>['state'];
  size: 'details' | 'row';
};
