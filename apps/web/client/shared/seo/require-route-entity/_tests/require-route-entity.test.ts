import { notFound } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import { requireRouteEntity, requireRouteMeta } from '../require-route-entity';

describe('requireRouteEntity', () => {
  it('returns an entity that exists without rendering not-found', async () => {
    const entity = { name: 'ИС-7', key: 'is-7', isFound: true };

    await expect(requireRouteEntity(Promise.resolve(entity))).resolves.toBe(entity);
    expect(notFound).not.toHaveBeenCalled();
  });

  it('renders not-found for an entity the API does not know', async () => {
    vi.mocked(notFound).mockImplementationOnce(() => {
      throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
    });

    await expect(requireRouteEntity(Promise.resolve({ name: 'missing', key: 'missing', isFound: false }))).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404'
    );

    expect(notFound).toHaveBeenCalledOnce();
  });

  it('lets a failed lookup propagate instead of turning an outage into a 404', async () => {
    await expect(requireRouteEntity(Promise.reject(new Error('API down')))).rejects.toThrow('API down');
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe('requireRouteMeta', () => {
  it('returns the meta of an entity that exists', async () => {
    const meta = { title: 'Патч 2.0' };

    await expect(requireRouteMeta(Promise.resolve({ meta, isFound: true }))).resolves.toBe(meta);
  });

  it('returns no meta during an outage without rendering not-found', async () => {
    await expect(requireRouteMeta(Promise.resolve({ meta: null, isFound: true }))).resolves.toBeNull();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('renders not-found for an entity the API does not know', async () => {
    vi.mocked(notFound).mockImplementationOnce(() => {
      throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
    });

    await expect(requireRouteMeta(Promise.resolve({ meta: null, isFound: false }))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});
