import { cacheLife } from 'next/cache';
import { connection } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UNAVAILABLE_CACHE_LIFE } from '@/shared/api/query-client';
import { NotFoundError } from '@/shared/api/source';

import { lookupRouteEntity, lookupRouteMeta, routeEntity, routeMeta, routeSlugs } from '../route-meta';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));
vi.mock('next/server', () => ({ connection: vi.fn(() => Promise.resolve()) }));

const fail = () => Promise.reject(new Error('down'));

describe('lookupRouteEntity', () => {
  it('returns the loaded name', async () => {
    await expect(lookupRouteEntity({ key: 'object-140', load: async () => 'Объект 140' })).resolves.toEqual({
      name: 'Объект 140',
      isFound: true,
      isAvailable: true
    });
  });

  it('reports a missing entity', async () => {
    await expect(lookupRouteEntity({ key: 'nobody', load: () => Promise.reject(new NotFoundError('404')) })).resolves.toEqual({
      name: 'nobody',
      isFound: false,
      isAvailable: true
    });
  });

  it('marks a transient failure as unavailable and keeps it in the cache only briefly', async () => {
    await expect(lookupRouteEntity({ key: 'object-140', load: fail })).resolves.toEqual({ name: 'object-140', isFound: true, isAvailable: false });
    expect(cacheLife).toHaveBeenCalledWith(UNAVAILABLE_CACHE_LIFE);
  });

  it('keeps a transient failure prerenderable, so a cache hit on another page never becomes an unexpected miss', () => {
    expect(UNAVAILABLE_CACHE_LIFE.expire).toBeGreaterThanOrEqual(300);
    expect(UNAVAILABLE_CACHE_LIFE.stale).toBeGreaterThanOrEqual(300);
  });
});

describe('lookupRouteMeta', () => {
  it('returns the loaded meta', async () => {
    await expect(lookupRouteMeta(async () => ({ title: 'Гайд' }))).resolves.toEqual({ meta: { title: 'Гайд' }, isFound: true, isAvailable: true });
  });

  it('reports a missing entity without shortening the cache', async () => {
    vi.mocked(cacheLife).mockClear();

    await expect(lookupRouteMeta(() => Promise.reject(new NotFoundError('404')))).resolves.toEqual({ meta: null, isFound: false, isAvailable: true });
    expect(cacheLife).not.toHaveBeenCalled();
  });

  it('marks a transient failure as unavailable, not missing', async () => {
    await expect(lookupRouteMeta(fail)).resolves.toEqual({ meta: null, isFound: true, isAvailable: false });
  });

  it('keeps a transient failure in the cache only briefly but long enough to prerender', async () => {
    vi.mocked(cacheLife).mockClear();

    await lookupRouteMeta(fail);

    expect(cacheLife).toHaveBeenCalledWith(UNAVAILABLE_CACHE_LIFE);
  });
});

describe('routeMeta', () => {
  beforeEach(() => {
    vi.mocked(connection).mockClear();
  });

  it('passes a found entity through and stays static', async () => {
    await expect(routeMeta(Promise.resolve({ meta: { title: 'Гайд' }, isFound: true, isAvailable: true }))).resolves.toEqual({
      meta: { title: 'Гайд' },
      isFound: true
    });

    expect(connection).not.toHaveBeenCalled();
  });

  it('renders at request time when the API was unavailable', async () => {
    await routeMeta(Promise.resolve({ meta: null, isFound: true, isAvailable: false }));

    expect(connection).toHaveBeenCalledOnce();
  });

  it('treats a lookup that throws as an outage, never as a missing entity', async () => {
    await expect(routeMeta(Promise.reject(new Error('down')))).resolves.toEqual({ meta: null, isFound: true });
  });
});

describe('routeEntity', () => {
  beforeEach(() => {
    vi.mocked(connection).mockClear();
  });

  it('passes the lookup result through and stays static', async () => {
    await expect(routeEntity({ key: 'nobody', lookup: async (name) => ({ name, isFound: false, isAvailable: true }) })).resolves.toEqual({
      name: 'nobody',
      isFound: false
    });

    expect(connection).not.toHaveBeenCalled();
  });

  it('renders the fallback at request time when the API was unavailable', async () => {
    await expect(routeEntity({ key: 'object-140', lookup: async (name) => ({ name, isFound: true, isAvailable: false }) })).resolves.toEqual({
      name: 'object-140',
      isFound: true
    });

    expect(connection).toHaveBeenCalledOnce();
  });

  it('falls back to the key and stays indexable when the lookup throws', async () => {
    await expect(routeEntity({ key: 'стример', lookup: fail })).resolves.toEqual({ name: 'стример', isFound: true });
    expect(connection).toHaveBeenCalledOnce();
  });
});

describe('routeSlugs', () => {
  it('returns the loaded slugs', async () => {
    await expect(routeSlugs({ fallback: 'x', load: async () => ['a', 'b'] })).resolves.toEqual(['a', 'b']);
  });

  it('falls back when the list is empty or fails', async () => {
    await expect(routeSlugs({ fallback: 'x', load: async () => [] })).resolves.toEqual(['x']);
    await expect(routeSlugs({ fallback: 'x', load: fail })).resolves.toEqual(['x']);
    await expect(routeSlugs({ load: fail })).resolves.toEqual([]);
  });
});
