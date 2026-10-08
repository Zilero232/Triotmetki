import { render } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import type { RouteGuardProps } from '../RouteGuard.types';

import { RouteGuard } from '../RouteGuard';

const FOUND = { name: 'ИС-7', key: 'is-7', isFound: true };

const structuredData = (container: HTMLElement) =>
  [...container.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.innerHTML));

describe('RouteGuard', () => {
  it('renders the structured data built from the found entity', async () => {
    const schema = vi.fn((entity: typeof FOUND) =>
      Promise.resolve({ '@context': 'https://schema.org', '@type': 'Thing', name: entity.name } as const)
    );

    const { container } = render(await RouteGuard({ entity: Promise.resolve(FOUND), schema }));

    expect(structuredData(container)).toEqual([{ '@context': 'https://schema.org', '@type': 'Thing', name: 'ИС-7' }]);
    expect(schema).toHaveBeenCalledWith(FOUND);
  });

  it('renders nothing for a found entity without a schema', async () => {
    expect(await RouteGuard({ entity: Promise.resolve(FOUND) })).toBeNull();
  });

  it('renders not-found before building any schema for a missing entity', async () => {
    const schema = vi.fn<NonNullable<RouteGuardProps['schema']>>();

    vi.mocked(notFound).mockImplementationOnce(() => {
      throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
    });

    await expect(RouteGuard({ entity: Promise.resolve({ name: 'missing', key: 'missing', isFound: false }), schema })).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404'
    );

    expect(schema).not.toHaveBeenCalled();
  });
});
