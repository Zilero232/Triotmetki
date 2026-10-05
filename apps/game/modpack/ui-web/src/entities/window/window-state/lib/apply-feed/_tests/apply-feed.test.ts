import { describe, expect, it } from 'vitest';

import type { UiFeed } from '@/shared/api/protocol';

import { applyFeed } from '../apply-feed';

const item = (id: string, damage = 1000) => ({ id, damage });

const snapshot: UiFeed = {
  v: 2,
  feed: 'replay_manager',
  rev: 4,
  base: null,
  page: { kind: 'replays', status: 'indexing' },
  items: [item('a'), item('b'), item('c')]
};

const delta = (values: Partial<UiFeed>): UiFeed => ({
  v: 2,
  feed: 'replay_manager',
  rev: 5,
  base: 4,
  page: { kind: 'replays', status: 'ready' },
  ...values
});

const otherFeed = { component: 'other', rev: 9, page: null, items: [] };

const heldSnapshot = () => applyFeed({ held: null, message: snapshot });

const patchDelta = delta({ set: [item('b', 2500), item('d')], del: ['a'] });

describe(applyFeed, () => {
  it('takes a snapshot when it holds nothing', () => {
    const held = applyFeed({ held: null, message: snapshot });

    expect(held).toEqual({
      component: 'replay_manager',
      rev: 4,
      page: { kind: 'replays', status: 'indexing' },
      items: [item('a'), item('b'), item('c')]
    });
  });

  it('takes a snapshot over the feed of another component', () => {
    const held = applyFeed({ held: otherFeed, message: snapshot });

    expect(held?.rev).toBe(4);
  });

  it('patches the items it holds: changed in place, new at the end, removed dropped', () => {
    const next = applyFeed({ held: heldSnapshot(), message: patchDelta });

    expect(next?.items).toEqual([item('b', 2500), item('c'), item('d')]);
  });

  it('keeps an untouched item as the same object', () => {
    const held = heldSnapshot();

    const next = applyFeed({ held, message: patchDelta });

    expect(next?.items[1]).toBe(held?.items[2]);
  });

  it('takes the page and the revision of the delta', () => {
    const next = applyFeed({ held: heldSnapshot(), message: patchDelta });

    expect(next?.page).toEqual({ kind: 'replays', status: 'ready' });
    expect(next?.rev).toBe(5);
  });

  it('keeps what it holds for a message it already has', () => {
    const held = heldSnapshot();

    const next = applyFeed({ held, message: snapshot });

    expect(next).toBe(held);
  });

  it('asks for a snapshot (null) when a delta builds on a revision it does not hold', () => {
    const next = applyFeed({ held: heldSnapshot(), message: delta({ rev: 7, base: 6, set: [] }) });

    expect(next).toBeNull();
  });

  it('asks for a snapshot (null) when a delta comes before any snapshot', () => {
    const next = applyFeed({ held: null, message: delta({ set: [] }) });

    expect(next).toBeNull();
  });
});
