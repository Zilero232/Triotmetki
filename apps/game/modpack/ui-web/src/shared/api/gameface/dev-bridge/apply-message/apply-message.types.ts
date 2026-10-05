import type { UiComponent, UiField, UiMessage, UiMessageOf, UiState } from '@/shared/api/protocol';

export type ApplyMessageInput = {
  state: UiState;
  message: UiMessage;
};

export type SettingValues = UiMessageOf<'set_many'>['values'];

export type SetFieldInput = { field: UiField; values: SettingValues };

export type SetComponentInput = { component: UiComponent; id: string; values: SettingValues };

export type SetValuesInput = { state: UiState; id: string; values: SettingValues };
