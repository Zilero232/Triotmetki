import type { ReplayItem } from '@/entities/replay/replay';

import type { ReplaysBrowserModel } from '../../../model/hooks';

export type ReplayDetailsProps = {
  item: ReplayItem;
  browser: ReplaysBrowserModel;
};

export type DetailsPartProps = { item: ReplayItem };

export type DetailsActionProps = ReplayDetailsProps;
