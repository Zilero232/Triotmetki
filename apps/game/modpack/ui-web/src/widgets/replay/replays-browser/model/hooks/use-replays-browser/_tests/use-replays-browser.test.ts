// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReplayItem } from '@/entities/replay/replay';

import { pageSample } from '@/entities/replay/replay/_tests/fixtures';
import { send } from '@/shared/api/protocol/protocol';

import { useReplaysBrowser } from '../use-replays-browser';

vi.mock('@/shared/api/protocol/protocol', () => ({ send: vi.fn(() => true) }));

const PAGE = pageSample();

const replayAt = (index: number): ReplayItem => {
  const item = PAGE.items[index];

  if (!item) {
    throw new Error(`the sample has no replay #${index}`);
  }

  return item;
};

const FAVOURITE = replayAt(0);
const OTHER_CLIENT = replayAt(1);

const mount = (page: unknown = PAGE, enabled = true) => renderHook(() => useReplaysBrowser({ page, enabled }));

const sent = (): unknown[] => vi.mocked(send).mock.calls.map(([message]) => message);

beforeEach(() => {
  vi.mocked(send).mockClear();
});

describe(useReplaysBrowser, () => {
  it('shows the list of a ready page', () => {
    expect(mount().result.current.view).toBe('list');
  });

  it('lists the whole page', () => {
    expect(mount().result.current.visible.map((item) => item.id)).toEqual([FAVOURITE.id, OTHER_CLIENT.id]);
  });

  it('selects the first replay', () => {
    expect(mount().result.current.selected?.id).toBe(FAVOURITE.id);
  });

  it('is off while the component is disabled', () => {
    expect(mount(PAGE, false).result.current.view).toBe('off');
  });

  it('is indexing before the first page arrives', () => {
    const hook = renderHook(() => useReplaysBrowser({ page: undefined, enabled: true }));

    expect(hook.result.current.view).toBe('indexing');
  });

  it.each([
    ['a missing page', null],
    ['a page that fails the schema', { kind: 'list' }]
  ])('calls %s unreadable', (_name, page) => {
    expect(mount(page).result.current.view).toBe('invalid');
  });

  it.each([
    ['no_account', 'a page without a bound account', { ...PAGE, status: 'no_account' }],
    ['empty', 'a ready page with no replays', { ...PAGE, items: [] }],
    ['indexing', 'a page still being read', { ...PAGE, status: 'indexing', items: [] }]
  ])('shows %s for %s', (view, _name, page) => {
    expect(mount(page).result.current.view).toBe(view);
  });

  it('says nothing was found when the filters hide every replay', () => {
    const hook = mount();

    act(() => hook.result.current.patch({ query: 'nothing like this' }));

    expect(hook.result.current.view).toBe('nothing');
  });

  it('lists the page again after a filter reset', () => {
    const hook = mount();

    act(() => hook.result.current.patch({ query: 'nothing like this' }));

    act(() => hook.result.current.reset());

    expect(hook.result.current.view).toBe('list');
  });

  it('sorts descending on the first pick of a sort', () => {
    const hook = mount();

    act(() => hook.result.current.sortBy('damage'));

    expect(hook.result.current.filters).toMatchObject({ sort: 'damage', descending: true });
  });

  it('flips the order on a second pick of the same sort', () => {
    const hook = mount();

    act(() => hook.result.current.sortBy('damage'));

    act(() => hook.result.current.sortBy('damage'));

    expect(hook.result.current.filters).toMatchObject({ sort: 'damage', descending: false });
  });

  it('asks for a confirmation before starting a replay', () => {
    const hook = mount();

    act(() => hook.result.current.askWatch(FAVOURITE));

    expect(hook.result.current.pending).toBe('watch');
  });

  it('starts nothing before the confirmation', () => {
    const hook = mount();

    act(() => hook.result.current.askWatch(FAVOURITE));

    expect(send).not.toHaveBeenCalled();
  });

  it('starts the replay once confirmed', () => {
    const hook = mount();

    act(() => hook.result.current.askWatch(FAVOURITE));

    act(() => hook.result.current.confirm());

    expect(sent()).toEqual([{ type: 'action', component: 'replay_manager', action: 'play', row: FAVOURITE.id }]);
  });

  it('closes the confirmation once confirmed', () => {
    const hook = mount();

    act(() => hook.result.current.askWatch(FAVOURITE));

    act(() => hook.result.current.confirm());

    expect(hook.result.current.pending).toBeNull();
  });

  it('forgets a delete request on cancel', () => {
    const hook = mount();

    act(() => hook.result.current.askRemove(FAVOURITE));

    act(() => hook.result.current.cancel());

    expect(hook.result.current.pending).toBeNull();
  });

  it('deletes nothing on cancel', () => {
    const hook = mount();

    act(() => hook.result.current.askRemove(FAVOURITE));

    act(() => hook.result.current.cancel());

    expect(send).not.toHaveBeenCalled();
  });

  it('forgets a delete request when another replay is selected', () => {
    const hook = mount();

    act(() => hook.result.current.askRemove(FAVOURITE));

    act(() => hook.result.current.select(OTHER_CLIENT.id));

    expect(hook.result.current.pending).toBeNull();
  });

  it('deletes nothing when another replay is selected', () => {
    const hook = mount();

    act(() => hook.result.current.askRemove(FAVOURITE));

    act(() => hook.result.current.select(OTHER_CLIENT.id));

    expect(send).not.toHaveBeenCalled();
  });

  it('deletes the replay once confirmed', () => {
    const hook = mount();

    act(() => hook.result.current.select(OTHER_CLIENT.id));
    act(() => hook.result.current.askRemove(OTHER_CLIENT));

    act(() => hook.result.current.confirm());

    expect(sent()).toEqual([{ type: 'action', component: 'replay_manager', action: 'delete', row: OTHER_CLIENT.id }]);
  });

  it('starts a rename from the current title', () => {
    const hook = mount();

    act(() => hook.result.current.startRename(FAVOURITE));

    expect(hook.result.current.draft).toBe('20260927_1405_ussr-R04_T-34_05_prohorovka');
  });

  it('ignores an empty new name', () => {
    const hook = mount();

    act(() => hook.result.current.startRename(FAVOURITE));
    act(() => hook.result.current.editRename('   '));

    act(() => hook.result.current.submitRename());

    expect(send).not.toHaveBeenCalled();
  });

  it('renames with the trimmed text', () => {
    const hook = mount();

    act(() => hook.result.current.startRename(FAVOURITE));
    act(() => hook.result.current.editRename('  best battle '));

    act(() => hook.result.current.submitRename());

    expect(sent()).toEqual([{ type: 'action', component: 'replay_manager', action: 'rename', row: FAVOURITE.id, value: 'best battle' }]);
  });

  it('closes the draft after a rename', () => {
    const hook = mount();

    act(() => hook.result.current.startRename(FAVOURITE));
    act(() => hook.result.current.editRename('  best battle '));

    act(() => hook.result.current.submitRename());

    expect(hook.result.current.draft).toBeNull();
  });

  it('takes a favourite off the favourites', () => {
    const hook = mount();

    act(() => hook.result.current.toggleFavourite(FAVOURITE));

    expect(sent()).toEqual([{ type: 'action', component: 'replay_manager', action: 'favourite', row: FAVOURITE.id, value: '0' }]);
  });

  it('adds a replay to the favourites', () => {
    const hook = mount();

    act(() => hook.result.current.toggleFavourite(OTHER_CLIENT));

    expect(sent()).toEqual([{ type: 'action', component: 'replay_manager', action: 'favourite', row: OTHER_CLIENT.id, value: '1' }]);
  });

  it('uploads a replay', () => {
    const hook = mount();

    act(() => hook.result.current.upload(OTHER_CLIENT));

    expect(sent()).toEqual([{ type: 'action', component: 'replay_manager', action: 'upload', row: OTHER_CLIENT.id }]);
  });

  it('opens the site page of an uploaded replay', () => {
    const hook = mount();

    act(() => hook.result.current.openSite(FAVOURITE));

    expect(sent()).toEqual([{ type: 'open', path: '/replays/7b0c2a44-1111-4111-8111-111111111111' }]);
  });

  it('opens nothing for a replay with no site link', () => {
    const hook = mount();

    act(() => hook.result.current.openSite(OTHER_CLIENT));

    expect(send).not.toHaveBeenCalled();
  });
});
