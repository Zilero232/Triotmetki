// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $undo } from '@/entities/window/window-state';

import { UNDO_TOAST } from '../../../../config';
import { useUndoToast } from '../use-undo-toast';

const entry = (id: number, label: string) => ({
  id,
  kind: label ? ('field' as const) : ('reset' as const),
  component: 'minimap',
  title: 'Миникарта',
  label,
  switchedOn: false,
  values: { zoom: 'native' }
});

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const flush = () => advance(1);

const showUndo = async (entries: Parameters<typeof $undo.set>[0]) => {
  const hook = renderHook(useUndoToast);

  act(() => $undo.set(entries));
  await flush();

  return hook;
};

beforeEach(() => {
  vi.useFakeTimers();
  $undo.set([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe(useUndoToast, () => {
  it('stays hidden until something changes', () => {
    expect(renderHook(useUndoToast).result.current.visible).toBe(false);
  });

  it('names the last change and counts the undo steps', async () => {
    const hook = await showUndo([entry(1, 'Масштаб'), entry(2, '')]);

    expect(hook.result.current).toMatchObject({ visible: true, text: 'Миникарта: Сброшено к стандартным', undoLabel: 'Отменить (2)' });
  });

  it('hides after a while', async () => {
    const hook = await showUndo([entry(1, 'Масштаб')]);

    await advance(UNDO_TOAST.hideMs);

    expect(hook.result.current.visible).toBe(false);
  });

  it('hides on dismiss', async () => {
    const hook = await showUndo([entry(1, 'Масштаб')]);

    act(() => hook.result.current.dismiss());

    expect(hook.result.current.visible).toBe(false);
  });

  it('comes back for the next change after a dismiss', async () => {
    const hook = await showUndo([entry(1, 'Масштаб')]);

    act(() => hook.result.current.dismiss());

    act(() => $undo.set([entry(1, 'Масштаб'), entry(2, 'Прозрачность')]));
    await flush();

    expect(hook.result.current).toMatchObject({ visible: true, text: 'Миникарта: Прозрачность. Изменено' });
  });

  it('says whether a switch went on or off', async () => {
    const hook = await showUndo([{ ...entry(1, 'Миникарта'), kind: 'switch', switchedOn: false }]);

    expect(hook.result.current.text).toBe('Миникарта: Выкл');
  });
});
