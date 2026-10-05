import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MODPACK_RELEASES_SOURCE } from '../../config/modpack-releases.constants';
import { INDEX } from '../../lib/release-index/_tests/fixtures';
import { ReleaseIndexReaderService } from '../release-index-reader.service';

const EMPTY = { schemaVersion: 1, releases: [] };
const MALFORMED = '{"schemaVersion": 1, "releases": [{"version": "latest"}]}';

const later = (ms: number) => vi.setSystemTime(Date.now() + ms + 1);
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('ReleaseIndexReaderService', () => {
  let dir = '';
  let path = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'otmetki-releases-'));
    path = join(dir, 'releases.json');
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(dir, { recursive: true, force: true });
  });

  it('answers with an empty index before the first release is published', async () => {
    await expect(new ReleaseIndexReaderService(path).load()).resolves.toEqual(EMPTY);
  });

  it('treats an empty file as an empty index', async () => {
    await writeFile(path, '  \n');

    await expect(new ReleaseIndexReaderService(path).load()).resolves.toEqual(EMPTY);
  });

  it('reads and validates the published index', async () => {
    await writeFile(path, JSON.stringify(INDEX));

    await expect(new ReleaseIndexReaderService(path).load()).resolves.toEqual(INDEX);
  });

  it('keeps serving the cached index until it goes stale', async () => {
    await writeFile(path, JSON.stringify(INDEX));

    const service = new ReleaseIndexReaderService(path);

    await service.load();
    await writeFile(path, JSON.stringify(EMPTY));

    await expect(service.load()).resolves.toEqual(INDEX);
  });

  it('answers from the stale copy at once and picks up the new file in the background', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await writeFile(path, JSON.stringify(INDEX));

    const service = new ReleaseIndexReaderService(path);

    await service.load();
    await writeFile(path, JSON.stringify(EMPTY));
    later(MODPACK_RELEASES_SOURCE.cacheTtlMs);

    await expect(service.load()).resolves.toEqual(INDEX);
    await vi.waitFor(async () => expect(await service.load()).toEqual(EMPTY));
  });

  it('keeps the last good index through a malformed file and retries only after the delay', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await writeFile(path, JSON.stringify(INDEX));

    const service = new ReleaseIndexReaderService(path);

    await service.load();
    await writeFile(path, MALFORMED);
    later(MODPACK_RELEASES_SOURCE.cacheTtlMs);
    await service.load();
    await settle();
    await writeFile(path, JSON.stringify(EMPTY));
    await service.load();
    await settle();

    await expect(service.load()).resolves.toEqual(INDEX);

    later(MODPACK_RELEASES_SOURCE.retryDelayMs);

    await vi.waitFor(async () => expect(await service.load()).toEqual(EMPTY));
  });

  it('refuses a malformed index when nothing is cached', async () => {
    await writeFile(path, MALFORMED);

    await expect(new ReleaseIndexReaderService(path).load()).rejects.toThrow();
  });
});
