import type { UiComponent, UiField, UiState } from '@/shared/api/protocol';

import { PROTOCOL } from '@/shared/api/protocol';

import type { ApplyMessageInput, SetComponentInput, SetFieldInput, SetValuesInput } from './apply-message.types';

import { DEV_MOCK } from '../dev-bridge.constants';

const setField = ({ field, values }: SetFieldInput): UiField => {
  const value = values[field.key];

  if (field.type === 'bool') {
    return typeof value === 'boolean' ? { ...field, value } : field;
  }

  if (field.type === 'int') {
    return typeof value === 'number' ? { ...field, value } : field;
  }

  return typeof value === 'string' ? { ...field, value } : field;
};

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

  if (message.type === 'set') {
    return { ...next, components: setValues({ state, id: message.component, values: { [message.key]: message.value } }) };
  }

  if (message.type === 'set_many') {
    return { ...next, components: setValues({ state, id: message.component, values: message.values }) };
  }

  if (message.type === 'window_layout') {
    const { x, y, width, height, zoom, placed = true } = message;

    return { ...next, window: { x, y, width, height, zoom, placed } };
  }

  if (message.type === 'language' && message.language !== PROTOCOL.autoLanguage) {
    return { ...next, language: message.language, language_setting: message.language };
  }

  return { ...next, notice: { kind: 'info', text: `${DEV_MOCK.noticePrefix} ${message.type}`, code: null } };
};
