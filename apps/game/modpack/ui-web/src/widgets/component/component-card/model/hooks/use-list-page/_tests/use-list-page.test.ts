// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UiRow } from '@/shared/api/protocol';

import { useListPage } from '../use-list-page';

const RENAME = { id: 'rename', label: 'Rename', input: 'old name' };
const DELETE = { id: 'delete', label: 'Delete' };

const ROWS: UiRow[] = [
  { id: 'a', title: 'First', details: [{ label: 'Damage', value: '1 200' }], actions: [RENAME, DELETE] },
  { id: 'b', title: 'Second', actions: [DELETE] },
  { id: 'c', title: 'Hits', figure: { shapes: [{ x: 0.2, y: 0.1, w: 0.6, h: 0.8 }], marks: [{ x: 0.5, y: 0.2, tone: 'pen' }] }, actions: [] }
];

const mount = () => {
  const onRun = vi.fn();

  return { onRun, hook: renderHook(() => useListPage({ rows: ROWS, onRun })) };
};

type Page = ReturnType<typeof mount>['hook'];

const openRename = (hook: Page) => {
  act(() => hook.result.current[0]?.actions[0]?.onClick());
};

const toggleDetails = ({ hook, row }: { hook: Page; row: number }) => {
  act(() => hook.result.current[row]?.toggleDetails());
};

describe(useListPage, () => {
  it('runs an action without input at once', () => {
    const { hook, onRun } = mount();

    act(() => hook.result.current[1]?.actions[0]?.onClick());

    expect(onRun).toHaveBeenCalledWith({ action: DELETE, row: 'b' });
  });

  it('opens an editor with the preset value only on the row of an action with input', () => {
    const { hook } = mount();

    openRename(hook);

    expect(hook.result.current[0]?.draftValue).toBe(RENAME.input);
    expect(hook.result.current[1]?.draftValue).toBeNull();
  });

  it('runs the action with the edited value on submit', () => {
    const { hook, onRun } = mount();

    openRename(hook);
    act(() => hook.result.current[0]?.editDraft('new name'));
    act(() => hook.result.current[0]?.submit());

    expect(onRun).toHaveBeenCalledWith({ action: RENAME, row: 'a', value: 'new name' });
  });

  it('closes the editor after submit', () => {
    const { hook } = mount();

    openRename(hook);
    act(() => hook.result.current[0]?.submit());

    expect(hook.result.current[0]?.draftValue).toBeNull();
  });

  it('closes the editor on cancel without running anything', () => {
    const { hook, onRun } = mount();

    openRename(hook);
    act(() => hook.result.current[0]?.cancel());

    expect(hook.result.current[0]?.draftValue).toBeNull();
    expect(onRun).not.toHaveBeenCalled();
  });

  it('offers details only on rows with details or a figure', () => {
    const { hook } = mount();

    expect(hook.result.current.map((row) => row.hasDetails)).toEqual([true, false, true]);
  });

  it('opens the details of a row on toggle', () => {
    const { hook } = mount();

    toggleDetails({ hook, row: 0 });

    expect(hook.result.current[0]?.detailsOpen).toBe(true);
  });

  it('closes the details of a row on a second toggle', () => {
    const { hook } = mount();

    toggleDetails({ hook, row: 0 });
    toggleDetails({ hook, row: 0 });

    expect(hook.result.current[0]?.detailsOpen).toBe(false);
  });

  it('keeps one row of details open at a time', () => {
    const { hook } = mount();

    toggleDetails({ hook, row: 0 });
    toggleDetails({ hook, row: 2 });

    expect(hook.result.current.map((row) => row.detailsOpen)).toEqual([false, false, true]);
  });
});
