import { describe, expect, it } from 'vitest';

import { splitColumns } from '../columns';

describe(splitColumns, () => {
  it('deals the cards left, right, left so each column keeps the page order', () => {
    const columns = splitColumns({ items: [1, 2, 3, 4, 5], columns: 2 });

    expect(columns).toEqual([
      { id: 'column-0', items: [1, 3, 5] },
      { id: 'column-1', items: [2, 4] }
    ]);
  });

  it('keeps one column for a narrow window', () => {
    expect(splitColumns({ items: ['a', 'b'], columns: 1 })).toEqual([{ id: 'column-0', items: ['a', 'b'] }]);
  });

  it('falls back to one column when asked for none', () => {
    expect(splitColumns({ items: ['a'], columns: 0 })).toEqual([{ id: 'column-0', items: ['a'] }]);
  });
});
