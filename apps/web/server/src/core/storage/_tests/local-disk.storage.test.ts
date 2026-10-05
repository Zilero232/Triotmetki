import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { StorageObjectMissingError } from '../errors/object-missing-error';
import { LocalDiskStorage } from '../local-disk.storage';

const body = new TextEncoder().encode('replay bytes');

describe('LocalDiskStorage', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'otmetki-storage-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reads back what it stored, creating nested folders', async () => {
    const storage = new LocalDiskStorage(root);

    await storage.put({ key: 'replays/2026/09/a.wotreplay', body, contentType: 'application/octet-stream' });

    expect(await storage.get('replays/2026/09/a.wotreplay')).toEqual(body);
  });

  it('removes an object and tolerates removing it twice', async () => {
    const storage = new LocalDiskStorage(root);

    await storage.put({ key: 'a.bin', body, contentType: 'application/octet-stream' });
    await storage.remove('a.bin');

    await expect(storage.remove('a.bin')).resolves.toBeUndefined();
    await expect(storage.get('a.bin')).rejects.toBeInstanceOf(StorageObjectMissingError);
  });

  it.each(['../outside.bin', 'nested/../../outside.bin', '/etc/passwd', ''])('refuses the key %j that escapes the storage root', async (key) => {
    const storage = new LocalDiskStorage(root);

    await expect(storage.put({ key, body, contentType: 'application/octet-stream' })).rejects.toThrow(/escapes/);
    await expect(storage.get(key)).rejects.toThrow(/escapes/);
    await expect(storage.remove(key)).rejects.toThrow(/escapes/);
  });

  it('refuses a sibling folder that merely shares the root name as a prefix', async () => {
    const storage = new LocalDiskStorage(root);

    await expect(storage.get(`../${root.split(/[\\/]/).at(-1) ?? ''}-evil/a.bin`)).rejects.toThrow(/escapes/);
  });
});
