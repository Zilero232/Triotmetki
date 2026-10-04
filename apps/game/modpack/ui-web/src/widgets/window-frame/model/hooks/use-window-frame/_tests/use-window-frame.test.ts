// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GAMEFACE } from '../../../../../../shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '../../../../../../shared/api/gameface/mock';
import { isRecord } from '../../../../../../shared/lib/is-record';
import { forgetReports } from '../../../../../../shared/lib/page-diag';
import { useWindowFrame } from '../use-window-frame';

const SCREEN_REM = { width: 1663, height: 962 };
const SCALE = 2;
const SAVED = { placed: true, x: 274, y: 135, width: 1240, height: 800, zoom: 100 };
const ORIGIN = { x: 0, y: 0 };

const install = (view: { x: number; y: number }) => {
  const mock = createGamefaceMock({
    state: '',
    clientSize: () => ({ width: SCREEN_REM.width * SCALE, height: SCREEN_REM.height * SCALE }),
    onSend: () => null
  });

  const viewEnv = mock.scope[GAMEFACE.globals.viewEnv];

  if (!isRecord(viewEnv)) {
    throw new Error('the Gameface mock has no viewEnv');
  }

  Object.assign(viewEnv, {
    [GAMEFACE.viewEnv.clientSizeRem]: () => SCREEN_REM,
    [GAMEFACE.viewEnv.viewPosition]: () => view,
    [GAMEFACE.viewEnv.viewSize]: () => SCREEN_REM,
    [GAMEFACE.viewEnv.remToPx]: (value: number) => value * SCALE
  });

  installGamefaceMock(mock);

  return mock;
};

const handleAt = (rect: { left: number; top: number; width: number; height: number }): HTMLDivElement => {
  const element = document.createElement('div');

  element.getBoundingClientRect = () => DOMRect.fromRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });

  return element;
};

const mouse = (type: string, clientX: number, clientY: number) => new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });

const drag = (from: { x: number; y: number }, to: { x: number; y: number }): void => {
  document.body.dispatchEvent(mouse('mousedown', from.x, from.y));
  document.body.dispatchEvent(mouse('mousemove', to.x, to.y));
  document.body.dispatchEvent(mouse('mouseup', to.x, to.y));
};

const layouts = (sent: string[]) => sent.map((raw): { type: string } => JSON.parse(raw)).filter((message) => message.type === 'window_layout');

const mountFrame = () => renderHook(() => useWindowFrame(SAVED));

const mountWithTitle = () => {
  const hook = mountFrame();

  hook.result.current.handles.move.current = handleAt({ left: 424, top: 162, width: 400, height: 120 });

  return hook;
};

const mountWithGrip = () => {
  const hook = mountFrame();

  hook.result.current.handles.corner.current = handleAt({ left: 2880, top: 1740, width: 36, height: 36 });

  return hook;
};

afterEach(() => {
  forgetReports();
  Object.values(GAMEFACE.globals).forEach((name) => Reflect.deleteProperty(globalThis, name));
});

describe(useWindowFrame, () => {
  it('opens centred on the screen at the saved size, whatever position was saved', () => {
    install(ORIGIN);

    const hook = mountFrame();

    expect(hook.result.current.frameStyle).toEqual({ left: '212rem', top: '81rem', width: '1240rem', height: '800rem' });
    hook.unmount();
  });

  it('places the box on the screen, not in a view the client put off the screen origin', () => {
    install({ x: 211.5, y: 81 });

    const hook = mountFrame();

    expect(hook.result.current.frameStyle).toEqual({ left: '106rem', top: '41rem', width: '1240rem', height: '800rem' });
    hook.unmount();
  });

  it('moves by the title on the presses Gameface sends to the document, in rem at the interface scale', () => {
    install(ORIGIN);
    const hook = mountWithTitle();

    act(() => drag({ x: 500, y: 200 }, { x: 400, y: 150 }));

    expect(hook.result.current.frameStyle).toMatchObject({ left: '162rem', top: '56rem' });
    hook.unmount();
  });

  it('saves the new place after a move', () => {
    const mock = install(ORIGIN);
    const hook = mountWithTitle();

    act(() => drag({ x: 500, y: 200 }, { x: 400, y: 150 }));

    expect(layouts(mock.sent())).toEqual([expect.objectContaining({ x: 162, y: 56, placed: true })]);
    hook.unmount();
  });

  it('ignores presses on the content', () => {
    install(ORIGIN);
    const hook = mountWithGrip();

    act(() => drag({ x: 1000, y: 800 }, { x: 900, y: 700 }));

    expect(hook.result.current.frameStyle).toMatchObject({ width: '1240rem', height: '800rem' });
    hook.unmount();
  });

  it('resizes by the grip', () => {
    install(ORIGIN);
    const hook = mountWithGrip();

    act(() => drag({ x: 2890, y: 1750 }, { x: 2790, y: 1650 }));

    expect(hook.result.current.frameStyle).toMatchObject({ width: '1190rem', height: '750rem' });
    hook.unmount();
  });

  it('resets a resized and zoomed window to the default size, zoom and the centre', () => {
    const mock = install(ORIGIN);
    const hook = mountWithGrip();

    act(() => drag({ x: 2890, y: 1750 }, { x: 2790, y: 1650 }));
    act(() => hook.result.current.zoomIn());
    act(() => hook.result.current.onReset());

    expect(hook.result.current).toMatchObject({ zoom: 100, frameStyle: { width: '1240rem', height: '800rem' } });
    expect(layouts(mock.sent()).at(-1)).toMatchObject({ width: 1240, height: 800, zoom: 100, placed: false });
    hook.unmount();
  });
});
