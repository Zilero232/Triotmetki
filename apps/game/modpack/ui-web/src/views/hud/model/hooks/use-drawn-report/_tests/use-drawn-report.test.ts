// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GAMEFACE } from '@/shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';

import { useDrawnReport } from '../use-drawn-report';

const CROSSHAIR = 'otmetki.hud.crosshair';

const DAMAGE_LOG = 'otmetki.hud.damage_log';

const install = () => {
  const mock = createGamefaceMock({ state: '', clientSize: () => ({ width: 1920, height: 1080 }), onSend: () => null });

  installGamefaceMock(mock);

  return mock;
};

const sent = (mock: ReturnType<typeof createGamefaceMock>): unknown[] => mock.sent().map((message): unknown => JSON.parse(message));

const labels = (drawn: Record<string, boolean>) => Object.entries(drawn).map(([id, isDrawn]) => ({ id, drawn: isDrawn }));

afterEach(() => {
  cleanup();
  Object.values(GAMEFACE.globals).forEach((name) => Reflect.deleteProperty(globalThis, name));
});

describe(useDrawnReport, () => {
  it('tells the game nothing while no panel is drawn', () => {
    const mock = install();

    renderHook(() => useDrawnReport(labels({ [CROSSHAIR]: false })));

    expect(sent(mock)).toEqual([]);
  });

  it('tells the game the panels it laid out with a size', () => {
    const mock = install();

    renderHook(() => useDrawnReport(labels({ [DAMAGE_LOG]: true, [CROSSHAIR]: true })));

    expect(sent(mock)).toEqual([{ type: 'drawn', ids: [CROSSHAIR, DAMAGE_LOG] }]);
  });

  it('tells the game again only when the drawn panels change', () => {
    const mock = install();
    const initialProps: { drawn: Record<string, boolean> } = { drawn: { [CROSSHAIR]: true } };
    const hook = renderHook(({ drawn }) => useDrawnReport(labels(drawn)), { initialProps });

    hook.rerender({ drawn: { [CROSSHAIR]: true } });
    hook.rerender({ drawn: {} });

    expect(sent(mock)).toEqual([
      { type: 'drawn', ids: [CROSSHAIR] },
      { type: 'drawn', ids: [] }
    ]);
  });
});
