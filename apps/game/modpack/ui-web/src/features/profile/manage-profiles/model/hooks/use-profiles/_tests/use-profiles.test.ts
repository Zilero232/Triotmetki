// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UiProfiles } from '@/shared/api/protocol';

import { send } from '@/shared/api/protocol/protocol';
import { KEYS } from '@/shared/config';

import { useProfiles } from '../use-profiles';

vi.mock('@/shared/api/protocol/protocol', () => ({ send: vi.fn(() => true) }));

const PROFILES: UiProfiles = {
  active: 'p1',
  items: [
    { id: 'p1', name: 'Streams', updated: 1 },
    { id: 'p2', name: 'Ranked', updated: 2 }
  ]
};

const mountProfiles = () => renderHook(() => useProfiles(PROFILES));

beforeEach(() => {
  vi.mocked(send).mockClear();
});

describe(useProfiles, () => {
  it('saves a new profile under the trimmed name on Enter', () => {
    const hook = mountProfiles();

    act(() => hook.result.current.setName('  Night  '));

    act(() => hook.result.current.onNameKey(KEYS.enter));

    expect(send).toHaveBeenCalledWith({ type: 'profile_save', name: 'Night' });
  });

  it('clears the name field after saving', () => {
    const hook = mountProfiles();

    act(() => hook.result.current.setName('  Night  '));

    act(() => hook.result.current.onNameKey(KEYS.enter));

    expect(hook.result.current.name).toBe('');
  });

  it('ignores a blank name', () => {
    const hook = mountProfiles();

    act(() => hook.result.current.setName('   '));

    act(() => hook.result.current.saveNew());

    expect(send).not.toHaveBeenCalled();
  });

  it('ignores a blank import code', () => {
    const hook = mountProfiles();

    act(() => hook.result.current.importProfile());

    expect(send).not.toHaveBeenCalled();
  });

  it('marks the active profile', () => {
    const hook = mountProfiles();

    expect(hook.result.current.rows.map((row) => row.active)).toEqual([true, false]);
  });

  it('overwrites a profile under its own name', () => {
    const hook = mountProfiles();

    act(() => hook.result.current.rows[1]?.overwrite());

    expect(send).toHaveBeenCalledWith({ type: 'profile_save', name: 'Ranked', id: 'p2' });
  });

  it('renames one row at a time', () => {
    const hook = mountProfiles();

    act(() => hook.result.current.rows[0]?.startRename());

    expect(hook.result.current.rows.map((row) => row.renameValue)).toEqual(['Streams', null]);
  });

  it('sends the trimmed new name and leaves the rename', () => {
    const hook = mountProfiles();

    act(() => hook.result.current.rows[0]?.startRename());
    act(() => hook.result.current.rows[0]?.editRename(' Stream nights '));

    act(() => hook.result.current.rows[0]?.commitRename());

    expect(send).toHaveBeenCalledWith({ type: 'profile_rename', id: 'p1', name: 'Stream nights' });
    expect(hook.result.current.rows[0]?.renameValue).toBeNull();
  });

  it('asks for a confirmation before deleting', () => {
    const hook = mountProfiles();

    act(() => hook.result.current.rows[1]?.askDelete());

    expect(hook.result.current.deleting).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('deletes the profile once confirmed', () => {
    const hook = mountProfiles();

    act(() => hook.result.current.rows[1]?.askDelete());

    act(() => hook.result.current.confirmDelete());

    expect(send).toHaveBeenCalledWith({ type: 'profile_delete', id: 'p2' });
    expect(hook.result.current.deleting).toBe(false);
  });
});
