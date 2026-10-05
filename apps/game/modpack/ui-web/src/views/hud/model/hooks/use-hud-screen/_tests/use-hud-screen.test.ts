// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { ClientSize } from '@/shared/api/gameface';

import { GAMEFACE } from '@/shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';

import { useHudScreen } from '../use-hud-screen';

type Engine = { client: ClientSize | null; scale: number };

const start = async (engine: Engine) => {
  const mock = createGamefaceMock({ state: '', clientSize: () => engine.client, remScale: () => engine.scale, onSend: () => null });

  installGamefaceMock(mock);

  const hook = renderHook(useHudScreen);

  await act(async () => {});

  return { mock, hook };
};

afterEach(() => {
  cleanup();
  Object.values(GAMEFACE.globals).forEach((name) => Reflect.deleteProperty(globalThis, name));
});

describe(useHudScreen, () => {
  it('reads the screen in design px over the scale the view reports', async () => {
    const { hook } = await start({ client: { width: 2560, height: 1440 }, scale: 2 });

    expect(hook.result.current).toEqual({ width: 1280, height: 720 });
  });

  it('reads the screen again once the engine is ready, with no timer', async () => {
    const engine: Engine = { client: null, scale: 1 };
    const pending = start(engine);

    engine.client = { width: 2560, height: 1440 };
    engine.scale = 1.6;
    const { hook } = await pending;

    expect(hook.result.current).toEqual({ width: 1600, height: 900 });
  });

  it('follows the client resize the engine reports', async () => {
    const engine: Engine = { client: { width: 1920, height: 1080 }, scale: 1 };
    const { hook, mock } = await start(engine);

    engine.client = { width: 3840, height: 2160 };
    act(() => mock.emit(GAMEFACE.engine.clientResized));

    expect(hook.result.current).toEqual({ width: 3840, height: 2160 });
  });

  it('follows the interface scale change the engine reports', async () => {
    const engine: Engine = { client: { width: 3840, height: 2160 }, scale: 1 };
    const { hook, mock } = await start(engine);

    engine.scale = 2;
    act(() => mock.emit(GAMEFACE.engine.scaleUpdated));

    expect(hook.result.current).toEqual({ width: 1920, height: 1080 });
  });

  it('sizes the view to the client once the engine is ready', async () => {
    const { mock } = await start({ client: { width: 1920, height: 1080 }, scale: 1 });

    expect(mock.resizes()).toContainEqual([1920, 1080]);
  });
});
