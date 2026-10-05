import { describe, expect, it, vi } from 'vitest';

import { paginate } from '../pagination';

const ROWS = ['a', 'b', 'c', 'd', 'e'];

describe('paginate', () => {
  it('fetches the requested window and reports the full total next to it', async () => {
    const result = await paginate({
      limit: 2,
      offset: 1,
      fetch: async ({ take, skip }) => ROWS.slice(skip, skip + take),
      count: async () => ROWS.length
    });

    expect(result).toEqual({ items: ['b', 'c'], total: ROWS.length, limit: 2, offset: 1 });
  });

  it('runs the window and the count side by side', async () => {
    const order: string[] = [];
    const fetch = vi.fn(async () => {
      order.push('fetch');

      return [];
    });

    const count = vi.fn(async () => {
      order.push('count');

      return 0;
    });

    const pending = paginate({ limit: 10, offset: 0, fetch, count });

    expect(order).toEqual(['fetch', 'count']);
    await pending;
  });
});
