import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { routing } from '../routing';

const intl = createMiddleware(routing);

describe('routing', () => {
  it('sends no hreflang Link header, the page metadata carries the alternates', () => {
    const response = intl(new NextRequest('http://localhost:3000/', { headers: { accept: 'text/html' } }));

    expect(response.headers.get('link')).toBeNull();
  });

  it('still rewrites an unprefixed path to the default locale', () => {
    const response = intl(new NextRequest('https://triotmetki.ru/t/62465/armor', { headers: { accept: 'text/html' } }));

    expect(response.headers.get('x-middleware-rewrite')).toBe('https://triotmetki.ru/ru/t/62465/armor');
  });
});
