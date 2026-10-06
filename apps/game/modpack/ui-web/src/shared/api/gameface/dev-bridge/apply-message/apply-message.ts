import { match, P } from 'ts-pattern';

import type { UiComponent, UiField, UiState } from '@/shared/api/protocol';

import { PROTOCOL } from '@/shared/api/protocol';

import type { ApplyMessageInput, SetComponentInput, SetFieldInput, SetValuesInput } from './apply-message.types';

import { DEV_MOCK } from '../dev-bridge.constants';

const setField = ({ field, values }: SetFieldInput): UiField =>
  match({ field, value: values[field.key] })
    .with({ field: { type: 'bool' }, value: P.boolean }, (bool) => ({ ...bool.field, value: bool.value }))
    .with({ field: { type: 'int' }, value: P.number }, (int) => ({ ...int.field, value: int.value }))
    .with({ field: { type: P.union('choice', 'text') }, value: P.string }, (text) => ({ ...text.field, value: text.value }))
    .otherwise(() => field);

const setComponent = ({ component, id, values }: SetComponentInput): UiComponent => {
  if (component.id !== id) {
    return component;
  }

  const value = component.switch && values[component.switch.key];
  const switched = component.switch && typeof value === 'boolean' ? { ...component.switch, value } : component.switch;

  return { ...component, switch: switched, fields: component.fields.map((field) => setField({ field, values })) };
};

const setValues = ({ state, id, values }: SetValuesInput): UiComponent[] =>
  state.components.map((component) => setComponent({ component, id, values }));

export const applyMessage = ({ state, message }: ApplyMessageInput): UiState => {
  const next = { ...state, revision: state.revision + 1, notice: null };

  return match(message)
    .with({ type: 'set' }, (set) => ({ ...next, components: setValues({ state, id: set.component, values: { [set.key]: set.value } }) }))
    .with({ type: 'set_many' }, (many) => ({ ...next, components: setValues({ state, id: many.component, values: many.values }) }))
    .with({ type: 'window_layout' }, ({ x, y, width, height, zoom, placed = true }) => ({ ...next, window: { x, y, width, height, zoom, placed } }))
    .with({ type: 'language', language: P.not(PROTOCOL.autoLanguage) }, ({ language }) => ({ ...next, language, language_setting: language }))
    .otherwise(({ type }) => ({ ...next, notice: { kind: 'info', text: `${DEV_MOCK.noticePrefix} ${type}`, code: null } }));
};
