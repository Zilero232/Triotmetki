import { describe, expect, it } from 'vitest';

import type { UiState } from '@/shared/api/protocol';

import { parseState } from '@/shared/api/protocol';
import sample from '@/shared/api/protocol/_tests/fixtures/state.sample.json';

import { DEV_MOCK } from '../../dev-bridge.constants';
import { applyMessage } from '../apply-message';

const parsed = parseState(JSON.stringify(sample));

if (!parsed) {
  throw new Error('state fixture does not parse');
}

const STATE = parsed;

const fieldValue = ({ state, component, key }: { state: UiState; component: string; key: string }) =>
  state.components.find(({ id }) => id === component)?.fields.find((field) => field.key === key)?.value;

describe(applyMessage, () => {
  it('writes a set message into its field', () => {
    const next = applyMessage({ state: STATE, message: { type: 'set', component: 'companion', key: 'send_battle_results', value: false } });

    expect(fieldValue({ state: next, component: 'companion', key: 'send_battle_results' })).toBe(false);
  });

  it('bumps the revision on every message', () => {
    const next = applyMessage({ state: STATE, message: { type: 'set', component: 'companion', key: 'send_battle_results', value: false } });

    expect(next.revision).toBe(2);
  });

  it('writes every value of a set_many message into its field', () => {
    const next = applyMessage({ state: STATE, message: { type: 'set_many', component: 'damage_log', values: { lines: 9, alpha: 70 } } });

    expect(fieldValue({ state: next, component: 'damage_log', key: 'lines' })).toBe(9);
    expect(fieldValue({ state: next, component: 'damage_log', key: 'alpha' })).toBe(70);
  });

  it('keeps the window where it was left', () => {
    const next = applyMessage({ state: STATE, message: { type: 'window_layout', x: 1, y: 2, width: 900, height: 600, zoom: 110 } });

    expect(next.window).toEqual({ placed: true, x: 1, y: 2, width: 900, height: 600, zoom: 110 });
  });

  it('switches the language', () => {
    const next = applyMessage({ state: STATE, message: { type: 'language', language: 'en' } });

    expect(next.language).toBe('en');
  });

  it('reports any other message as a notice', () => {
    const next = applyMessage({ state: STATE, message: { type: 'close' } });

    expect(next.notice).toEqual({ kind: 'info', text: `${DEV_MOCK.noticePrefix} close`, code: null });
  });
});
