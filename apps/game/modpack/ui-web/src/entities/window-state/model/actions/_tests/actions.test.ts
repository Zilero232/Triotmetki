import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { UiComponent } from '../../../../../shared/api/protocol';

import { GAMEFACE } from '../../../../../shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '../../../../../shared/api/gameface/mock';
import { parseState } from '../../../../../shared/api/protocol';
import { $undo } from '../../store';
import { changeSetting, resetComponent, toggleSwitch, undoLast } from '../actions';

const sample = readFileSync(path.resolve(import.meta.dirname, '../../../../../shared/api/protocol/_tests/fixtures/state.sample.json'), 'utf8');

const component = (id: string): UiComponent => {
  const found = parseState(sample)?.components.find((item) => item.id === id);

  if (!found) {
    throw new Error(id);
  }

  return found;
};

const changedDamageLog = (): UiComponent => {
  const damage = component('damage_log');

  return {
    ...damage,
    fields: damage.fields.map((field) => {
      if (field.type === 'int' && field.key === 'lines') {
        return { ...field, value: 9 };
      }

      return field.type === 'int' && field.key === 'alpha' ? { ...field, value: 70 } : field;
    })
  };
};

const install = () => {
  const mock = createGamefaceMock({ state: sample, clientSize: () => ({ width: 1920, height: 1080 }), onSend: () => null });

  installGamefaceMock(mock);

  return () => mock.sent().map((message) => JSON.parse(message));
};

const undoEntries = () => $undo.get().map(({ kind, component: id, label, switchedOn, values }) => [kind, id, label, switchedOn, values]);

const changeInterval = (value: number): void => {
  changeSetting({ component: component('session_stats'), key: 'session_idle_minutes', value });
};

beforeEach(() => {
  $undo.set([]);
});

afterEach(() => {
  Object.values(GAMEFACE.globals).forEach((name) => Reflect.deleteProperty(globalThis, name));
});

describe(changeSetting, () => {
  it('sends a changed setting to the mod at once', () => {
    const sent = install();

    changeInterval(30);

    expect(sent()).toEqual([{ type: 'set', component: 'session_stats', key: 'session_idle_minutes', value: 30 }]);
  });

  it('remembers the previous value of the field for undo', () => {
    install();

    changeInterval(30);

    expect(undoEntries()).toEqual([['field', 'session_stats', 'Новая сессия после простоя, мин', false, { session_idle_minutes: 60 }]]);
  });

  it('skips a change to the same value', () => {
    const sent = install();

    changeInterval(60);

    expect(sent()).toEqual([]);
    expect($undo.get()).toEqual([]);
  });
});

describe(toggleSwitch, () => {
  it('switches a card off at once', () => {
    const sent = install();

    toggleSwitch(component('marks_panel'));

    expect(sent()).toEqual([{ type: 'set', component: 'marks_panel', key: 'battle_moe_panel', value: false }]);
  });

  it('remembers the switch was on for undo', () => {
    install();

    toggleSwitch(component('marks_panel'));

    expect(undoEntries()).toEqual([['switch', 'marks_panel', 'Отметки', false, { battle_moe_panel: true }]]);
  });
});

describe(resetComponent, () => {
  it('sends nothing for a card already at its defaults', () => {
    const sent = install();

    resetComponent(component('damage_log'));

    expect(sent()).toEqual([]);
  });

  it('resets a card to its defaults in one message', () => {
    const sent = install();

    resetComponent(changedDamageLog());

    expect(sent()).toEqual([{ type: 'set_many', component: 'damage_log', values: { alpha: 100, lines: 5 } }]);
  });
});

describe(undoLast, () => {
  it('undoes the latest change first, sending the previous values back', () => {
    const sent = install();

    changeInterval(30);
    toggleSwitch(component('marks_panel'));

    undoLast();
    undoLast();

    expect(sent().slice(2)).toEqual([
      { type: 'set', component: 'marks_panel', key: 'battle_moe_panel', value: true },
      { type: 'set', component: 'session_stats', key: 'session_idle_minutes', value: 60 }
    ]);

    expect($undo.get()).toEqual([]);
  });

  it('sends nothing when there is nothing to undo', () => {
    const sent = install();

    undoLast();

    expect(sent()).toEqual([]);
  });

  it('undoes a reset in one message', () => {
    const sent = install();

    resetComponent(changedDamageLog());

    undoLast();

    expect(sent()).toHaveLength(2);
    expect(sent().at(-1)).toEqual({ type: 'set_many', component: 'damage_log', values: { alpha: 70, lines: 9 } });
  });
});
