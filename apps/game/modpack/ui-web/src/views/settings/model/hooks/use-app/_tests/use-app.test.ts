// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { $invalid, $state } from '@/entities/window/window-state';
import { GAMEFACE } from '@/shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';
import stateSample from '@/shared/api/protocol/_tests/fixtures/state.sample.json?raw';
import { forgetReports } from '@/shared/lib/page-diag';

import { useApp } from '../use-app';

const SAMPLE = stateSample;

const startApp = async (state: string) => {
  const mock = createGamefaceMock({ state, clientSize: () => ({ width: 1920, height: 1080 }), onSend: () => null });

  installGamefaceMock(mock);

  const hook = renderHook(useApp);

  await act(async () => {});
  await act(async () => {});

  const sent = () => mock.sent().map((message): { type: string } => JSON.parse(message));

  return { mock, hook, sent };
};

beforeEach(() => {
  $state.set(null);
  $invalid.set(false);
});

afterEach(() => {
  forgetReports();
  Object.values(GAMEFACE.globals).forEach((name) => Reflect.deleteProperty(globalThis, name));
});

describe(useApp, () => {
  it('announces itself to the mod once it starts', async () => {
    const { sent } = await startApp(SAMPLE);

    const messages = sent().filter((message) => message.type !== 'diag');

    expect(messages).toEqual([{ type: 'ready' }]);
  });

  it('reports its page diagnostics to the game log', async () => {
    const { sent } = await startApp(SAMPLE);

    const types = sent().map((message) => message.type);

    expect(types).toContain('diag');
  });

  it('takes the state the mod pushes', async () => {
    const { hook } = await startApp(SAMPLE);

    const { state } = hook.result.current;

    expect(state?.revision).toBe(1);
  });

  it('asks the mod to close the window when Esc comes with nothing open', async () => {
    const { mock, sent } = await startApp(SAMPLE);

    mock.push({ escape: 1 });

    expect(sent().at(-1)).toEqual({ type: 'close' });
  });

  it('shows no state when the push does not parse', async () => {
    const { hook } = await startApp('{"v": 99}');

    const { state } = hook.result.current;

    expect(state).toBeNull();
  });

  it('shows the invalid-state note when the push does not parse', async () => {
    const { hook } = await startApp('{"v": 99}');

    const { placeholderKey } = hook.result.current;

    expect(placeholderKey).toBe('invalidState');
  });
});
