import RedisMock from 'ioredis-mock';
import { describe, expect, it, vi } from 'vitest';

import { advanceWatermark } from '../redis-watermark';

const KEY = 'otmetki:test:watermark';
const NOW = new Date('2026-10-05T12:00:00.000Z');
const STORED = '2026-10-05T11:00:00.000Z';

const row = (minute: number) => ({ id: minute, receivedAt: new Date(Date.UTC(2026, 9, 5, 11, minute)) });

describe('advanceWatermark', () => {
  it('stores now on the first run without reading or processing anything', async () => {
    const redis = new RedisMock();
    const fetch = vi.fn(async () => [row(1)]);
    const process = vi.fn(async () => 1);

    const processed = await advanceWatermark({ redis, key: KEY, now: NOW, fetch, process });

    expect(processed).toBe(0);
    expect(await redis.get(KEY)).toBe(NOW.toISOString());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reads the rows after the stored watermark', async () => {
    const redis = new RedisMock();
    const fetch = vi.fn(async () => []);

    await redis.set(KEY, STORED);
    await advanceWatermark({ redis, key: KEY, now: NOW, fetch, process: async () => 0 });

    expect(fetch).toHaveBeenCalledWith(new Date(STORED));
  });

  it('keeps the watermark when no row arrived', async () => {
    const redis = new RedisMock();
    const process = vi.fn(async () => 1);

    await redis.set(KEY, STORED);

    const processed = await advanceWatermark({ redis, key: KEY, now: NOW, fetch: async () => [], process });

    expect(processed).toBe(0);
    expect(process).not.toHaveBeenCalled();
    expect(await redis.get(KEY)).toBe(STORED);
  });

  it('processes the batch and moves the watermark to its last row', async () => {
    const redis = new RedisMock();
    const rows = [row(10), row(20)];

    await redis.set(KEY, STORED);

    const processed = await advanceWatermark({ redis, key: KEY, now: NOW, fetch: async () => rows, process: async (batch) => batch.rows.length });

    expect(processed).toBe(2);
    expect(await redis.get(KEY)).toBe(rows[1]?.receivedAt.toISOString());
  });

  it('keeps the watermark when processing fails so the batch is read again', async () => {
    const redis = new RedisMock();

    await redis.set(KEY, STORED);

    const run = advanceWatermark({ redis, key: KEY, now: NOW, fetch: async () => [row(10)], process: async () => Promise.reject(new Error('down')) });

    await expect(run).rejects.toThrow('down');
    expect(await redis.get(KEY)).toBe(STORED);
  });
});
