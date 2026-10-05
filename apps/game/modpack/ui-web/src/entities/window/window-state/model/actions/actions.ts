import type { UiComponent } from '@/shared/api/protocol';

import { send } from '@/shared/api/protocol';

import type { UndoEntry } from '../store';
import type { ChangeSettingInput, SendValuesInput, SetSettingInput } from './actions.types';

import { WINDOW_VIEW } from '../../config';
import { currentValues, defaultValues, labelOf, valueOf } from '../../lib/components';
import { $undo } from '../store';

const remember = (entry: Omit<UndoEntry, 'id'>): void => {
  const stack = $undo.get();
  const id = (stack.at(-1)?.id ?? 0) + 1;

  $undo.set([...stack, { ...entry, id }].slice(-WINDOW_VIEW.undoLimit));
};

const sendValues = ({ component, values }: SendValuesInput): void => {
  const entries = Object.entries(values);
  const [single] = entries;

  if (entries.length === 1 && single) {
    send({ type: 'set', component, key: single[0], value: single[1] });

    return;
  }

  if (entries.length > 0) {
    send({ type: 'set_many', component, values });
  }
};

const setSetting = ({ component, key, value }: SetSettingInput): void => {
  send({ type: 'set', component, key, value });
};

export const changeSetting = ({ component, key, value }: ChangeSettingInput): void => {
  const previous = valueOf({ component, key });

  if (previous === null || previous === value) {
    return;
  }

  remember({
    kind: component.switch?.key === key ? 'switch' : 'field',
    component: component.id,
    title: component.title,
    label: labelOf({ component, key }),
    switchedOn: value === true,
    values: { [key]: previous }
  });

  setSetting({ component: component.id, key, value });
};

export const toggleSwitch = (component: UiComponent): void => {
  if (component.switch) {
    changeSetting({ component, key: component.switch.key, value: !component.switch.value });
  }
};

export const resetComponent = (component: UiComponent): void => {
  const values = defaultValues(component);

  if (Object.keys(values).length === 0) {
    return;
  }

  remember({ kind: 'reset', component: component.id, title: component.title, label: '', switchedOn: false, values: currentValues(component) });
  sendValues({ component: component.id, values });
};

export const undoLast = (): void => {
  const stack = $undo.get();
  const last = stack.at(-1);

  if (!last) {
    return;
  }

  $undo.set(stack.slice(0, -1));
  sendValues({ component: last.component, values: last.values });
};
