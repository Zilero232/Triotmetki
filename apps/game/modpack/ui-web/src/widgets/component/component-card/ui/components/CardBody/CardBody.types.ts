import type { UiComponent } from '@/shared/api/protocol';

import type { ComponentCardModel } from '../../ComponentCard.types';

export type CardBodyProps = {
  component: UiComponent;
  card: ComponentCardModel;
};
