import { describe, expect, it } from 'vitest';

import type { ReplayFilters, ReplaysPage } from '@/entities/replay/replay';

import { DEFAULT_REPLAY_FILTERS } from '@/entities/replay/replay';
import { pageSample } from '@/entities/replay/replay/_tests/fixtures';

import { sortedBy, viewOf } from '../browser-view';

const page = (overrides: Partial<ReplaysPage> = {}): ReplaysPage => ({ ...pageSample(), ...overrides });

const filters = (overrides: Partial<ReplayFilters> = {}): ReplayFilters => ({ ...DEFAULT_REPLAY_FILTERS, ...overrides });

describe(viewOf, () => {
  it('shows the switched-off state before anything else', () => {
    const view = viewOf({ page: null, raw: undefined, enabled: false, shown: 0 });

    expect(view).toBe('off');
  });

  it('shows indexing while no page has arrived', () => {
    const view = viewOf({ page: null, raw: undefined, enabled: true, shown: 0 });

    expect(view).toBe('indexing');
  });

  it('shows an invalid page when the page does not parse', () => {
    const view = viewOf({ page: null, raw: { broken: true }, enabled: true, shown: 0 });

    expect(view).toBe('invalid');
  });

  it('asks for an account when the page has none', () => {
    const view = viewOf({ page: page({ status: 'no_account' }), raw: {}, enabled: true, shown: 0 });

    expect(view).toBe('no_account');
  });

  it('shows nothing-found when the filters hide every replay', () => {
    const view = viewOf({ page: page(), raw: {}, enabled: true, shown: 0 });

    expect(view).toBe('nothing');
  });

  it('shows the list when some replays pass the filters', () => {
    const view = viewOf({ page: page(), raw: {}, enabled: true, shown: 1 });

    expect(view).toBe('list');
  });
});

describe(sortedBy, () => {
  it('flips the direction when the same column is picked again', () => {
    const next = sortedBy('damage')(filters({ sort: 'damage', descending: true }));

    expect(next.descending).toBe(false);
  });

  it('sorts a new column from the top', () => {
    const next = sortedBy('damage')(filters({ sort: 'time', descending: false }));

    expect(next).toMatchObject({ sort: 'damage', descending: true });
  });
});
