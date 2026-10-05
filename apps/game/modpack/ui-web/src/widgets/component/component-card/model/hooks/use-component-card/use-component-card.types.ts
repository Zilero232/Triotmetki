import type { UiComponent, UiField } from '@/shared/api/protocol';

export type UseComponentCardInput = {
  component: UiComponent;
  fields?: UiField[];
};
