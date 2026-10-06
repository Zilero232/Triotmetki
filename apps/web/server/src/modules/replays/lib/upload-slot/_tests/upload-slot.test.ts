import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';

import { claimUploadSlot, releaseUploadSlot } from '../upload-slot';

const KEY = 'otmetki:test:uploading';
const SLOT = { key: KEY, limit: 2, ttlSeconds: 600 };

describe('claimUploadSlot', () => {
  it('grants slots up to the limit', async () => {
    const redis = new RedisMock();

    await claimUploadSlot({ redis, ...SLOT });

    await expect(claimUploadSlot({ redis, ...SLOT })).resolves.toBe(true);
  });

  it('refuses a slot past the limit without counting it', async () => {
    const redis = new RedisMock();

    await claimUploadSlot({ redis, ...SLOT });
    await claimUploadSlot({ redis, ...SLOT });

    await expect(claimUploadSlot({ redis, ...SLOT })).resolves.toBe(false);
    await expect(redis.get(KEY)).resolves.toBe(String(SLOT.limit));
  });

  it('keeps the counter expiring', async () => {
    const redis = new RedisMock();

    await claimUploadSlot({ redis, ...SLOT });

    await expect(redis.ttl(KEY)).resolves.toBeGreaterThan(0);
  });
});

describe('releaseUploadSlot', () => {
  it('frees a slot for the next upload', async () => {
    const redis = new RedisMock();

    await claimUploadSlot({ redis, ...SLOT });
    await claimUploadSlot({ redis, ...SLOT });
    await releaseUploadSlot({ redis, key: KEY });

    await expect(claimUploadSlot({ redis, ...SLOT })).resolves.toBe(true);
  });

  it('never leaves a negative counter when the slot already expired', async () => {
    const redis = new RedisMock();

    await releaseUploadSlot({ redis, key: KEY });

    await expect(redis.exists(KEY)).resolves.toBe(0);
  });

  it('removes the key with the last slot instead of leaving a zero without a ttl', async () => {
    const redis = new RedisMock();

    await claimUploadSlot({ redis, ...SLOT });
    await releaseUploadSlot({ redis, key: KEY });

    await expect(redis.exists(KEY)).resolves.toBe(0);
  });
});
