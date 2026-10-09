import { PAGINATION } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { isSameListKey, nextPageOffset } from '../page-offset';

describe('nextPageOffset', () => {
  it('points past the loaded items while more remain', () => {
    expect(nextPageOffset({ items: [1, 2, 3], total: 10, offset: 0 })).toBe(3);
    expect(nextPageOffset({ items: [1, 2], total: 10, offset: 6 })).toBe(8);
  });

  it('stops exactly when the last item is loaded', () => {
    expect(nextPageOffset({ items: [1, 2], total: 10, offset: 8 })).toBeUndefined();
  });

  it('stops on an empty page even if the total claims more', () => {
    expect(nextPageOffset({ items: [], total: 10, offset: 4 })).toBeUndefined();
  });

  it('stops before an offset the API would refuse', () => {
    const items = [1, 2];

    expect(nextPageOffset({ items, total: PAGINATION.maxOffset * 2, offset: PAGINATION.maxOffset - items.length })).toBe(PAGINATION.maxOffset);
    expect(nextPageOffset({ items, total: PAGINATION.maxOffset * 2, offset: PAGINATION.maxOffset - 1 })).toBeUndefined();
  });
});

describe('isSameListKey', () => {
  it('treats a change of the trailing params as the same list', () => {
    expect(isSameListKey({ previous: ['replays', 'list', { map: 1 }], next: ['replays', 'list', { map: 2 }] })).toBe(true);
  });

  it('treats another list as a different one', () => {
    expect(isSameListKey({ previous: ['replays', 'mine', { limit: 25 }], next: ['replays', 'list', { limit: 25 }] })).toBe(false);
  });

  it('has nothing to compare before the first load', () => {
    expect(isSameListKey({ previous: undefined, next: ['replays', 'list', {}] })).toBe(false);
  });
});
