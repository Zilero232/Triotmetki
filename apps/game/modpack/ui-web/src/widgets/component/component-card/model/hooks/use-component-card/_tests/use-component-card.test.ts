// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UiAction, UiComponent, UiField } from '@/shared/api/protocol';

import { $editor, $editorFocus } from '@/entities/window/window-state';
import { send } from '@/shared/api/protocol/protocol';

import { useComponentCard } from '../use-component-card';

vi.mock('@/shared/api/protocol/protocol', () => ({ send: vi.fn(() => true) }));

const action = (overrides: Partial<UiAction> = {}): UiAction => ({ id: 'clear', label: 'Clear', ...overrides });

const component = (overrides: Partial<UiComponent> = {}): UiComponent => ({
  id: 'replay_manager',
  group: 'hangar',
  section: 'replays',
  context: 'hangar',
  title: 'Replays',
  hint: null,
  switch: { key: 'hangar_replay_manager', value: true },
  fields: [],
  panel: false,
  actions: [],
  page: null,
  ...overrides
});

const mountCard = (input: Parameters<typeof useComponentCard>[0]) => renderHook(() => useComponentCard(input));

const pressFirstAction = (card: ReturnType<typeof mountCard>) => {
  act(() => card.result.current.actionItems[0]?.onClick());
};

const WITH_CONFIRMED_ACTION = component({ actions: [action({ confirm: 'Sure?' })] });

beforeEach(() => {
  vi.mocked(send).mockClear();
  $editor.set(null);
});

describe(useComponentCard, () => {
  it('opens the page of a card with an editor', () => {
    const card = mountCard({ component: component({ editor: { groups: [], icons: {}, swatches: {} } }) });

    act(() => card.result.current.open());

    expect($editor.get()).toBe('replay_manager');
  });

  it('opens the page of a card without an editor too', () => {
    const card = mountCard({ component: component({ actions: [action()] }) });

    act(() => card.result.current.open());

    expect($editor.get()).toBe('replay_manager');
  });

  it('opens a search result on the setting it found', () => {
    const size: UiField = { key: 'size', label: 'Size', hint: null, type: 'bool', value: true, default: true };
    const card = mountCard({ component: component({ fields: [size] }), fields: [size] });

    act(() => card.result.current.open());

    expect($editorFocus.get()).toBe('size');
  });

  it('runs an action without a confirmation at once', () => {
    const card = mountCard({ component: component({ actions: [action()] }) });

    pressFirstAction(card);

    expect(send).toHaveBeenCalledWith({ type: 'action', component: 'replay_manager', action: 'clear' });
  });

  it('asks first when the action carries a confirmation', () => {
    const card = mountCard({ component: WITH_CONFIRMED_ACTION });

    pressFirstAction(card);

    expect(card.result.current.confirmText).toBe('Sure?');
    expect(send).not.toHaveBeenCalled();
  });

  it('sends the confirmed action once and closes the question', () => {
    const card = mountCard({ component: WITH_CONFIRMED_ACTION });

    pressFirstAction(card);
    act(() => card.result.current.confirm());

    expect(send).toHaveBeenCalledOnce();
    expect(card.result.current.confirmText).toBeNull();
  });

  it('drops the pending action on cancel', () => {
    const card = mountCard({ component: WITH_CONFIRMED_ACTION });

    pressFirstAction(card);
    act(() => card.result.current.cancel());

    expect(card.result.current.confirmText).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('opens a site link instead of calling the component', () => {
    const card = mountCard({ component: component({ actions: [action({ link: '/me/replays' })] }) });

    pressFirstAction(card);

    expect(send).toHaveBeenCalledWith({ type: 'open', path: '/me/replays' });
  });

  it('shows the empty note for a card without fields, actions and a page', () => {
    expect(mountCard({ component: component({ panel: true }) }).result.current.showEmpty).toBe(true);
  });

  it('hides the empty note for a card with a page', () => {
    const withPage = component({ page: { kind: 'list', empty: '', rows: [] } });

    expect(mountCard({ component: withPage }).result.current.showEmpty).toBe(false);
  });

  it('marks where the component works', () => {
    const { badges } = mountCard({ component: component({ context: 'any' }) }).result.current;

    expect(badges.map(({ key }) => key)).toEqual(['contextHangar', 'contextBattle']);
  });
});
