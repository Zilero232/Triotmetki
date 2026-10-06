// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UiPanel } from '@/shared/api/protocol';

import { send } from '@/shared/api/protocol/protocol';

import { useHudEditor } from '../use-hud-editor';

vi.mock('@/shared/api/protocol/protocol', () => ({ send: vi.fn(() => true) }));

const panel = (overrides: Partial<UiPanel> = {}): UiPanel => ({
  id: 'damage_log',
  title: 'Damage log',
  enabled: true,
  x: 20,
  y: -200,
  align_x: 'left',
  align_y: 'bottom',
  preview: null,
  width: 240,
  height: 90,
  ...overrides
});

const key = (name: string) => ({ key: name, preventDefault: vi.fn() });

const mountEditor = (panels: UiPanel[] = [panel()]) => renderHook(() => useHudEditor(panels));

const mouse = (type: string, clientX: number, clientY: number) => window.dispatchEvent(new MouseEvent(type, { clientX, clientY }));

const mountOnStage = () => {
  const hook = mountEditor();
  const stage = document.createElement('div');

  stage.getBoundingClientRect = () => DOMRect.fromRect({ width: 1920, height: 1080 });
  hook.result.current.stageRef.current = stage;
  act(() => hook.result.current.panels[0]?.onMouseDown({ clientX: 100, clientY: 100 }));

  return hook;
};

beforeEach(() => {
  vi.mocked(send).mockClear();
});

describe(useHudEditor, () => {
  it('takes an arrow key from the page', () => {
    const hook = mountEditor();
    const press = key('ArrowRight');

    act(() => hook.result.current.panels[0]?.onKeyDown(press));

    expect(press.preventDefault).toHaveBeenCalledOnce();
  });

  it('nudges a panel by the arrow step on the grid and sends its new placement', () => {
    const hook = mountEditor();

    act(() => hook.result.current.panels[0]?.onKeyDown(key('ArrowRight')));

    expect(send).toHaveBeenCalledWith({ type: 'hud_move', panel: 'damage_log', x: 24, y: -198, align_x: 'left', align_y: 'bottom' });
  });

  it('selects the nudged panel', () => {
    const hook = mountEditor();

    act(() => hook.result.current.panels[0]?.onKeyDown(key('ArrowRight')));

    expect(hook.result.current.panels[0]?.selected).toBe(true);
  });

  it('leaves other keys to the page', () => {
    const hook = mountEditor();
    const press = key('Tab');

    act(() => hook.result.current.panels[0]?.onKeyDown(press));

    expect(press.preventDefault).not.toHaveBeenCalled();
  });

  it('moves nothing on other keys', () => {
    const hook = mountEditor();

    act(() => hook.result.current.panels[0]?.onKeyDown(key('Tab')));

    expect(send).not.toHaveBeenCalled();
  });

  it('resets nothing while no panel is selected', () => {
    const hook = mountEditor();

    act(() => hook.result.current.resetSelected());

    expect(send).not.toHaveBeenCalled();
  });

  it('resets the selected panel', () => {
    const hook = mountEditor();

    act(() => hook.result.current.panels[0]?.onMouseDown({ clientX: 0, clientY: 0 }));

    act(() => hook.result.current.resetSelected());

    expect(send).toHaveBeenCalledWith({ type: 'hud_reset', panel: 'damage_log' });
  });

  it('keeps the panel selected after a reset', () => {
    const hook = mountEditor();

    act(() => hook.result.current.panels[0]?.onMouseDown({ clientX: 0, clientY: 0 }));

    act(() => hook.result.current.resetSelected());

    expect(hook.result.current.hasSelection).toBe(true);
  });

  it('places each panel on the stage in screen percentages', () => {
    const hook = mountEditor([panel({ x: 192 })]);

    expect(hook.result.current.panels[0]?.style.left).toBe('10%');
  });

  it('keeps a press moved by less than the drag slop where it was', () => {
    mountOnStage();

    act(() => mouse('mousemove', 103, 103));
    act(() => mouse('mouseup', 103, 103));

    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing while a panel is dragged', () => {
    mountOnStage();

    act(() => mouse('mousemove', 160, 100));

    expect(send).not.toHaveBeenCalled();
  });

  it('sends the new placement once, on mouse-up', () => {
    mountOnStage();

    act(() => mouse('mousemove', 140, 100));
    act(() => mouse('mousemove', 160, 100));
    act(() => mouse('mouseup', 160, 100));

    expect(vi.mocked(send).mock.calls).toEqual([[expect.objectContaining({ type: 'hud_move', panel: 'damage_log', x: 80 })]]);
  });
});
