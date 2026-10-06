// @vitest-environment jsdom
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';

import { GAMEFACE } from '@/shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';
import hudStateSample from '@/shared/api/hud-protocol/_tests/fixtures/hud-state.sample.json?raw';

import { HUD_OVERLAY } from '../../../../config';
import { useHudOverlay } from '../use-hud-overlay';

type Point = { x: number; y: number };

const SAMPLE = hudStateSample;

const CLIENT = { width: 1920, height: 1080 };

const LABEL_ID = 'otmetki.hud.damage_log';

const ON_LABEL = { x: 20, y: 940 };

const OFF_EVERY_PANEL = { x: 900, y: 300 };

const PANEL_HINT = 'Нанесённый и полученный урон за бой.';

const sampleSchema = z.looseObject({ panels: z.array(z.record(z.string(), z.unknown())) });

const withState = ({ patch = {}, panel = {} }: { patch?: Record<string, unknown>; panel?: Record<string, unknown> }): string => {
  const state = sampleSchema.parse(JSON.parse(SAMPLE));

  return JSON.stringify({ ...state, ...patch, panels: state.panels.map((item) => ({ ...item, ...panel })) });
};

const OUTSIDE_EDIT = withState({ patch: { edit: false } });

const QUIET = withState({ patch: { edit: false, hover: false } });

const start = async ({ state, mouse, tooltips }: { state: string; mouse?: () => Point; tooltips?: boolean }) => {
  const mock = createGamefaceMock({ state, clientSize: () => CLIENT, mouse, tooltips, onSend: () => null });

  installGamefaceMock(mock);

  const hook = renderHook(useHudOverlay);

  await act(async () => {});

  return { mock, hook };
};

const mount = async (state: string) => {
  const overlay = await start({ state });

  await act(async () => {});

  return overlay;
};

const NO_INPUT = [0, 0, 1, 1];

const WHOLE_SCREEN = [0, 0, 1920, 1080];

const messageSchema = z.looseObject({ type: z.string() });

const allSent = (mock: ReturnType<typeof createGamefaceMock>) => mock.sent().map((message) => messageSchema.parse(JSON.parse(message)));

const sent = (mock: ReturnType<typeof createGamefaceMock>): unknown[] => allSent(mock).filter(({ type }) => type !== 'area');

const areaReports = (mock: ReturnType<typeof createGamefaceMock>): unknown[] => allSent(mock).filter(({ type }) => type === 'area');

const sentAfterReady = (mock: ReturnType<typeof createGamefaceMock>): unknown[] => sent(mock).slice(1);

const mouseEvent = ({ type, at }: { type: string; at: Point }) =>
  new MouseEvent(type, { clientX: at.x, clientY: at.y, button: 0, bubbles: true, cancelable: true });

const drag = (to: Point) => {
  fireEvent(window, mouseEvent({ type: 'mousedown', at: ON_LABEL }));
  fireEvent(window, mouseEvent({ type: 'mousemove', at: to }));
  fireEvent(window, mouseEvent({ type: 'mouseup', at: to }));
};

const wheelUp = () => new WheelEvent('wheel', { clientX: ON_LABEL.x, clientY: ON_LABEL.y, deltaY: -100, cancelable: true });

const startInBattle = async ({ state = SAMPLE, tooltips = false }: { state?: string; tooltips?: boolean } = {}) => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

  const pointer = { ...OFF_EVERY_PANEL };
  const overlay = await start({ state, mouse: () => pointer, tooltips });

  const hover = (at: Point) => {
    Object.assign(pointer, at);
    act(() => vi.advanceTimersByTime(HUD_OVERLAY.hoverPollMs));
  };

  hover(OFF_EVERY_PANEL);

  return { ...overlay, hover };
};

afterEach(() => {
  cleanup();
  Object.values(GAMEFACE.globals).forEach((name) => Reflect.deleteProperty(globalThis, name));
  document.documentElement.style.fontSize = '';
  vi.useRealTimers();
});

describe(useHudOverlay, () => {
  it('announces itself to the game once mounted', async () => {
    const { mock } = await mount(SAMPLE);

    expect(sent(mock)).toEqual([{ type: 'ready' }]);
  });

  it('places a pushed label on the client screen, hidden until measured', async () => {
    const { hook } = await mount(SAMPLE);

    expect(hook.result.current.labels[0]?.style).toEqual({ left: '20rem', top: '940rem', opacity: 0 });
  });

  it('brings a label hidden with the stock GUI back at the same place', async () => {
    const { hook, mock } = await mount(SAMPLE);

    await act(async () => {});
    const before = hook.result.current.labels[0]?.style;

    act(() => mock.push({ state: withState({ panel: { visible: false } }) }));
    act(() => mock.push({ state: SAMPLE }));
    await act(async () => {});

    expect(hook.result.current.labels[0]?.style).toEqual(before);
  });

  it('turns the label text into styled runs', async () => {
    const { hook } = await mount(SAMPLE);

    expect(hook.result.current.labels[0]?.lines?.[0]?.runs[0]).toMatchObject({ kind: 'text', style: { color: '#F2EAD3' } });
  });

  it('sizes the overlay to the client screen', async () => {
    const { hook } = await mount(SAMPLE);

    expect(hook.result.current.style).toEqual({ width: '1920rem', height: '1080rem' });
  });

  it('shows no frame and takes no mouse until the edit modifier is held', async () => {
    const { hook } = await mount(OUTSIDE_EDIT);

    expect(hook.result.current.labels[0]).toMatchObject({ interactive: false, framed: false });
  });

  it('ignores presses and the wheel until the edit modifier is held', async () => {
    const { mock } = await mount(OUTSIDE_EDIT);

    drag({ x: 50, y: 50 });
    fireEvent(window, wheelUp());

    expect(sent(mock)).toHaveLength(1);
  });

  it('frames the labels and takes the mouse while the edit modifier is held', async () => {
    const { hook } = await mount(SAMPLE);

    expect(hook.result.current.labels[0]).toMatchObject({ interactive: true, framed: true });
  });

  it('claims a press on a label whatever element is under the pointer', async () => {
    await mount(SAMPLE);
    const icon = document.createElement('img');
    const press = mouseEvent({ type: 'mousedown', at: ON_LABEL });

    document.body.append(icon);
    fireEvent(icon, press);
    icon.remove();

    expect(press.defaultPrevented).toBe(true);
  });

  it('marks a label as dragged while the pointer moves', async () => {
    const { hook } = await mount(SAMPLE);

    fireEvent(window, mouseEvent({ type: 'mousedown', at: ON_LABEL }));
    fireEvent(window, mouseEvent({ type: 'mousemove', at: { x: 1620, y: 140 } }));

    expect(hook.result.current.labels[0]?.dragging).toBe(true);
  });

  it('reports the new anchor to the game when a drag ends', async () => {
    const { mock } = await mount(SAMPLE);

    drag({ x: 1620, y: 140 });

    expect(sentAfterReady(mock)).toEqual([
      { type: 'mouse', event: 'down' },
      { type: 'moved', id: LABEL_ID, x: -300, y: 140, align_x: 'right', align_y: 'top' }
    ]);
  });

  it('stops marking the label as dragged when the drag ends', async () => {
    const { hook } = await mount(SAMPLE);

    drag({ x: 1620, y: 140 });

    expect(hook.result.current.labels[0]?.dragging).toBe(false);
  });

  it('keeps the moved place when the next state still carries the old one until the game saves it', async () => {
    const { hook } = await mount(SAMPLE);

    drag({ x: 120, y: 900 });

    expect(hook.result.current.labels[0]?.style).toMatchObject({ left: '120rem', top: '900rem' });
  });

  it('starts no drag when the press misses every panel', async () => {
    const { mock } = await mount(SAMPLE);

    fireEvent(window, mouseEvent({ type: 'mousedown', at: OFF_EVERY_PANEL }));
    fireEvent(window, mouseEvent({ type: 'mouseup', at: { x: 1000, y: 400 } }));

    expect(sent(mock)).toHaveLength(1);
  });

  it('claims the wheel over a label while the modifier is held', async () => {
    await mount(SAMPLE);
    const wheel = wheelUp();

    fireEvent(window, wheel);

    expect(wheel.defaultPrevented).toBe(true);
  });

  it('reports the new scale to the game on the wheel', async () => {
    const { mock } = await mount(SAMPLE);

    fireEvent(window, wheelUp());

    expect(sentAfterReady(mock)).toEqual([
      { type: 'mouse', event: 'wheel' },
      { type: 'resized', id: LABEL_ID, scale: 1.1 }
    ]);
  });

  it('scales the label from its top left corner on the wheel', async () => {
    const { hook } = await mount(SAMPLE);

    fireEvent(window, wheelUp());

    expect(hook.result.current.labels[0]?.style).toMatchObject({ transform: 'scale(1.1)', transformOrigin: '0 0' });
  });

  it('keeps the same style object for a label whose place did not change', async () => {
    const { mock, hook } = await mount(SAMPLE);
    const before = hook.result.current.labels[0]?.style;

    act(() => mock.push({ state: withState({ panel: { text: 'урон 1 300' } }) }));

    expect(hook.result.current.labels[0]?.style).toBe(before);
  });

  it('lets every click through outside an edit when no panel is clickable', async () => {
    const { mock } = await mount(OUTSIDE_EDIT);

    expect(mock.inputAreas().at(-1)).toEqual(NO_INPUT);
  });

  it('takes the whole screen for the mouse in a hangar edit', async () => {
    const { mock } = await mount(withState({ patch: { hover: false } }));

    expect(mock.inputAreas().at(-1)).toEqual(WHOLE_SCREEN);
  });

  it('tells the game its input area is limited outside an edit', async () => {
    const { mock } = await mount(OUTSIDE_EDIT);

    expect(areaReports(mock)).toEqual([{ type: 'area', whole: false }]);
  });

  it('tells the game once when a hangar edit takes the whole screen and once when it ends', async () => {
    const { mock } = await mount(OUTSIDE_EDIT);

    act(() => mock.push({ state: withState({ patch: { hover: false } }) }));
    act(() => mock.push({ state: OUTSIDE_EDIT }));

    expect(areaReports(mock)).toEqual([
      { type: 'area', whole: false },
      { type: 'area', whole: true },
      { type: 'area', whole: false }
    ]);
  });

  it('gives the whole screen back to the game when the edit modifier is released', async () => {
    const { mock } = await mount(withState({ patch: { hover: false } }));

    act(() => mock.push({ state: OUTSIDE_EDIT }));

    expect(mock.inputAreas().at(-1)).toEqual(NO_INPUT);
  });

  it('sets its input area again every refresh, in case the engine reset it with the view', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { mock } = await mount(OUTSIDE_EDIT);
    const before = mock.inputAreas().length;

    act(() => vi.advanceTimersByTime(HUD_OVERLAY.inputAreaRefreshMs));

    expect(mock.inputAreas().slice(before)).toEqual([NO_INPUT]);
  });

  it('leaves its input area alone while nothing is edited or hovered', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { mock } = await mount(QUIET);
    const before = mock.inputAreas().length;

    act(() => vi.advanceTimersByTime(HUD_OVERLAY.inputAreaRefreshMs * 3));

    expect(mock.inputAreas().length).toBe(before);
  });

  it('tries its input area again every refresh after the engine refused it', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const mock = createGamefaceMock({ state: QUIET, clientSize: () => CLIENT, onSend: () => null });
    const viewEnv = z.record(z.string(), z.unknown()).parse(mock.scope[GAMEFACE.globals.viewEnv]);
    const setInputArea = viewEnv[GAMEFACE.viewEnv.inputArea];

    Reflect.deleteProperty(viewEnv, GAMEFACE.viewEnv.inputArea);
    installGamefaceMock(mock);
    renderHook(useHudOverlay);
    await act(async () => {});
    viewEnv[GAMEFACE.viewEnv.inputArea] = setInputArea;

    act(() => vi.advanceTimersByTime(HUD_OVERLAY.inputAreaRefreshMs));

    expect(mock.inputAreas()).toEqual([NO_INPUT]);
  });

  it('lets the mouse through in battle while the cursor is off every panel', async () => {
    const { mock } = await startInBattle();

    expect(mock.inputAreas().at(-1)).toEqual(NO_INPUT);
  });

  it('takes the mouse in battle only over the panel under the cursor', async () => {
    const { mock, hover } = await startInBattle();

    hover(ON_LABEL);

    expect(mock.inputAreas().at(-1)?.slice(0, 2)).toEqual([20, 940]);
  });

  it('reports the hover to the game when the cursor reaches a panel in battle', async () => {
    const { mock, hover } = await startInBattle();

    hover(ON_LABEL);

    expect(sentAfterReady(mock)).toEqual([{ type: 'mouse', event: 'hover' }]);
  });

  it('takes the whole screen for the mouse while a panel is dragged in battle', async () => {
    const { mock, hover } = await startInBattle();

    hover(ON_LABEL);
    fireEvent(window, mouseEvent({ type: 'mousedown', at: ON_LABEL }));

    expect(mock.inputAreas().at(-1)).toEqual(WHOLE_SCREEN);
  });

  it('describes the panel under the cursor with its hint', async () => {
    const { hook, hover } = await startInBattle();

    hover(ON_LABEL);

    expect(hook.result.current.hint?.text).toBe(PANEL_HINT);
  });

  it('shows the new hint the game sends after a language switch', async () => {
    const { hook, hover, mock } = await startInBattle();

    hover(ON_LABEL);

    act(() => mock.push({ state: withState({ panel: { hint: 'Damage dealt and received in the battle.' } }) }));

    expect(hook.result.current.hint?.text).toBe('Damage dealt and received in the battle.');
  });

  it('drops the hint once the cursor leaves the panel', async () => {
    const { hook, hover } = await startInBattle();

    hover(ON_LABEL);

    hover(OFF_EVERY_PANEL);

    expect(hook.result.current.hint).toBeNull();
  });

  it('drops the hint when the battle cursor hides', async () => {
    const { hook, hover, mock } = await startInBattle();

    hover(ON_LABEL);

    act(() => mock.push({ state: withState({ patch: { cursor: false, edit: false } }) }));

    expect(hook.result.current.hint).toBeNull();
  });

  it('describes a pinned panel without taking the mouse over it', async () => {
    const { hook, hover, mock } = await startInBattle({ state: withState({ panel: { drag: false } }) });

    hover(ON_LABEL);

    expect(hook.result.current.hint?.text).toBe(PANEL_HINT);
    expect(mock.inputAreas().at(-1)).toEqual(NO_INPUT);
  });

  it('draws its own readable hint even when the client offers its tooltip', async () => {
    const { hook, hover } = await startInBattle({ tooltips: true });

    hover(ON_LABEL);

    expect(hook.result.current.hint?.text).toBe(PANEL_HINT);
  });

  it('never opens the client tooltip, whose body text is too dim over the battle', async () => {
    const { hover, mock } = await startInBattle({ tooltips: true });

    hover(ON_LABEL);

    expect(mock.viewEvents()).toEqual([]);
  });

  it('draws a known widget instead of the text', async () => {
    const widget = {
      kind: 'clock_strip',
      v: 1,
      data: {
        icon: 'otmetki:clock',
        time: '21:47',
        date: '',
        server: 'RU4',
        ping_icon: 'otmetki:ping',
        ping: '42 ms',
        ping_tone: 'good',
        online_label: 'online',
        online: '81 234'
      }
    };

    const { hook } = await mount(withState({ panel: { widget } }));

    expect(hook.result.current.labels[0]?.widget?.kind).toBe('clock_strip');
  });

  it('falls back to the text for an unknown widget', async () => {
    const { hook } = await mount(withState({ panel: { widget: { kind: 'nope', v: 1, data: {} } } }));

    expect(hook.result.current.labels[0]?.widget).toBeNull();
  });

  it('moves an attached panel when the game sends the measured stock bar width', async () => {
    const attachedTo = (bar: number) => withState({ panel: { attach: { kind: 'bar_right', bar, minimap: 310 } } });
    const { hook, mock } = await mount(attachedTo(399));

    act(() => mock.push({ state: attachedTo(456) }));

    expect(hook.result.current.labels[0]?.style).toMatchObject({ left: '1200rem' });
  });

  it('ignores a state that does not parse', async () => {
    const { hook } = await mount('{"v": 99}');

    expect(hook.result.current.labels).toEqual([]);
  });
});
