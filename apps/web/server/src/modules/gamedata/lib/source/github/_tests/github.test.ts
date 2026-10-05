import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FetchLike } from '../../source.types';

import { GAME_DATA_SOURCES, GITHUB } from '../../source.constants';
import { createGithubReader, rawUrl } from '../github';

const SHA = 'a'.repeat(40);
const source = GAME_DATA_SOURCES.RU;

const createFetch = (files: Record<string, string>, failures: Record<string, number> = {}) => {
  const calls: string[] = [];

  const fetch: FetchLike = async (request) => {
    const input = request instanceof Request ? request.url : String(request);

    calls.push(input);

    if (input.startsWith(GITHUB.api)) {
      return Response.json({ sha: SHA, commit: { committer: { date: '2026-09-24T10:25:35Z' } } });
    }

    const path = input.slice(rawUrl({ owner: source.owner, repo: source.repo, sha: SHA, path: '' }).length);

    if ((failures[path] ?? 0) > 0) {
      failures[path] -= 1;

      return new Response('busy', { status: 503 });
    }

    return path in files ? new Response(files[path]) : new Response('missing', { status: 404 });
  };

  return { fetch, calls };
};

describe('createGithubReader', () => {
  let cacheDir = '';

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'gamedata-'));
  });

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  it('pins the branch to a commit and records its date', async () => {
    const { fetch } = createFetch({});
    const reader = await createGithubReader({ sourceId: 'RU', cacheDir, fetch });

    expect(reader.revision).toMatchObject({ sourceId: 'RU', ref: source.ref, sha: SHA, committedAt: '2026-09-24T10:25:35Z' });
  });

  it('downloads raw files once and then serves them from the cache', async () => {
    const { fetch, calls } = createFetch({ '.version_name': '1.45.0.5231' });
    const reader = await createGithubReader({ sourceId: 'RU', cacheDir, fetch });

    expect(await reader.read('.version_name')).toBe('1.45.0.5231');
    expect(await reader.read('.version_name')).toBe('1.45.0.5231');

    const second = await createGithubReader({ sourceId: 'RU', cacheDir, fetch });

    expect(await second.read('.version_name')).toBe('1.45.0.5231');
    expect(calls.filter((url) => url.startsWith(GITHUB.raw))).toHaveLength(1);
  });

  it('remembers missing files and retries server errors', async () => {
    const { fetch, calls } = createFetch({ 'a.xml': '<root/>' }, { 'a.xml': 2 });
    const reader = await createGithubReader({ sourceId: 'RU', cacheDir, fetch, retryDelayMs: 1 });

    expect(await reader.read('missing.xml')).toBeUndefined();
    expect(await reader.read('missing.xml')).toBeUndefined();
    expect(await reader.read('a.xml')).toBe('<root/>');
    expect(calls.filter((url) => url.endsWith('missing.xml'))).toHaveLength(1);
    expect(calls.filter((url) => url.endsWith('a.xml'))).toHaveLength(3);
  });

  it('keeps a commit sha GitHub cannot resolve as the pinned commit', async () => {
    const fetch: FetchLike = async () => new Response('gone', { status: 422 });
    const reader = await createGithubReader({ sourceId: 'RU', ref: SHA.toUpperCase(), cacheDir, fetch });

    expect(reader.revision.sha).toBe(SHA);
  });

  it('reports the GitHub status for a branch it cannot resolve', async () => {
    const fetch: FetchLike = async () => new Response('missing', { status: 404 });

    await expect(createGithubReader({ sourceId: 'RU', ref: 'no-such-branch', cacheDir, fetch })).rejects.toThrow(/GitHub 404 resolving/);
  });

  it('asks GitHub once for the commit', async () => {
    const { fetch, calls } = createFetch({});

    await createGithubReader({ sourceId: 'RU', cacheDir, fetch });

    expect(calls.filter((url) => url.startsWith(GITHUB.api))).toHaveLength(1);
  });
});
