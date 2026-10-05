import type { SettingValue, UiComponent } from '@/shared/api/protocol';

import type { ComponentValues } from '../../lib/components';

export type SettingInput = {
  key: string;
  value: SettingValue;
};

export type SetSettingInput = SettingInput & {
  component: string;
};

export type ChangeSettingInput = SettingInput & {
  component: UiComponent;
};

export type SendValuesInput = {
  component: string;
  values: ComponentValues;
};
