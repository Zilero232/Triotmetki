import { INTERNAL_REQUEST } from '@otmetki/schemas';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { blogControllerArticle, missionsControllerOperation, playersControllerProfile, tanksControllerDetail } from '@/shared/api/generated';
import { NotFoundError } from '@/shared/api/source';

import { canonicalRedirect, checkEntity, clientIpOf, isDocumentRequest, missingEntityRewrite, splitLocale } from '../entity-presence';

const api = vi.hoisted(() => ({ tankSlug: 'object-140', clanTag: 'KOPTE', nickname: 'Nick_Name' }));

vi.mock('@/shared/api/generated', () => ({
  blogControllerArticle: vi.fn(async () => ({ data: {} })),
  clansControllerPage: vi.fn(async () => ({ data: { clan: { tag: api.clanTag } } })),
  mapsControllerDetail: vi.fn(),
  missionsControllerOperation: vi.fn(async () => ({ data: {} })),
  playersControllerProfile: vi.fn(async () => ({ data: { summary: { nickname: api.nickname } } })),
  streamersControllerBySlug: vi.fn(async () => ({ data: {} })),
  tanksControllerDetail: vi.fn(async () => ({ data: { vehicle: { slug: api.tankSlug } } }))
}));

describe('entity presence', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('splits the locale prefix off a path', () => {
    expect(splitLocale('/en/p/Nick')).toEqual({ locale: 'en', path: '/p/Nick' });
    expect(splitLocale('/p/Nick')).toEqual({ locale: 'ru', path: '/p/Nick' });
  });

  it('checks only HTML page loads', () => {
    expect(isDocumentRequest(new NextRequest('http://localhost/p/x', { headers: { accept: 'text/html,application/xhtml+xml' } }))).toBe(true);
    expect(isDocumentRequest(new NextRequest('http://localhost/p/x', { headers: { accept: '*/*' } }))).toBe(false);
  });

  it('reports a missing entity when the API answers 404', async () => {
    vi.mocked(playersControllerProfile).mockRejectedValueOnce(new NotFoundError('missing'));

    await expect(checkEntity({ path: '/p/No%20Such', clientIp: null })).resolves.toEqual({ isMissing: true, canonicalPath: null });
    expect(vi.mocked(playersControllerProfile).mock.calls[0]?.[0]).toMatchObject({ path: { idOrNick: 'No Such' }, headers: {} });
  });

  it('forwards the visitor address so the API limits the visitor, not the Next server', async () => {
    await checkEntity({ path: '/t/object-140', clientIp: '192.0.2.10' });

    expect(vi.mocked(tanksControllerDetail).mock.calls[0]?.[0]).toMatchObject({ headers: { [INTERNAL_REQUEST.clientIpHeader]: '192.0.2.10' } });
  });

  it('reads the visitor address the reverse proxy put first in X-Forwarded-For', () => {
    expect(clientIpOf(new NextRequest('http://localhost/p/x', { headers: { 'x-forwarded-for': '192.0.2.10, 172.18.0.2' } }))).toBe('192.0.2.10');
    expect(clientIpOf(new NextRequest('http://localhost/p/x'))).toBeNull();
  });

  it('lets the page render when the entity sits at its canonical key', async () => {
    await expect(checkEntity({ path: '/t/object-140/armor', clientIp: null })).resolves.toEqual({ isMissing: false, canonicalPath: null });
  });

  it('lets the page render when the API is unreachable or the path is no entity', async () => {
    vi.mocked(tanksControllerDetail).mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(checkEntity({ path: '/builds/object-140', clientIp: null })).resolves.toEqual({ isMissing: false, canonicalPath: null });
    await expect(checkEntity({ path: '/tanks', clientIp: null })).resolves.toEqual({ isMissing: false, canonicalPath: null });
  });

  it('points a numeric tank id at the slug, keeping the rest of the path', async () => {
    await expect(checkEntity({ path: '/t/19969/armor', clientIp: null })).resolves.toEqual({
      isMissing: false,
      canonicalPath: '/t/object-140/armor'
    });
  });

  it('points a clan id or a lower-case tag at the tag the API spells', async () => {
    await expect(checkEntity({ path: '/c/kopte/workspace', clientIp: null })).resolves.toEqual({
      isMissing: false,
      canonicalPath: '/c/KOPTE/workspace'
    });
  });

  it('points an account id at the nickname', async () => {
    await expect(checkEntity({ path: '/p/1234567/sessions/9', clientIp: null })).resolves.toEqual({
      isMissing: false,
      canonicalPath: '/p/Nick_Name/sessions/9'
    });
  });

  it('checks blog posts but leaves the editor alone', async () => {
    vi.mocked(blogControllerArticle).mockRejectedValueOnce(new NotFoundError('missing'));

    await expect(checkEntity({ path: '/blog/no-such-post', clientIp: null })).resolves.toEqual({ isMissing: true, canonicalPath: null });
    await expect(checkEntity({ path: '/blog/editor', clientIp: null })).resolves.toEqual({ isMissing: false, canonicalPath: null });
    expect(blogControllerArticle).toHaveBeenCalledOnce();
  });

  it('reports a mission operation with malformed ids as missing without asking the API', async () => {
    await expect(checkEntity({ path: '/missions/999/abc', clientIp: null })).resolves.toEqual({ isMissing: true, canonicalPath: null });
    expect(missionsControllerOperation).not.toHaveBeenCalled();
  });

  it('asks the API about a well-formed mission operation', async () => {
    await expect(checkEntity({ path: '/missions/1/12', clientIp: null })).resolves.toEqual({ isMissing: false, canonicalPath: null });
    expect(vi.mocked(missionsControllerOperation).mock.calls[0]?.[0]).toMatchObject({ path: { campaign: 1, operation: 12 } });
  });

  it('rewrites a missing entity to an unmatched localized path', () => {
    const response = missingEntityRewrite({ request: new NextRequest('http://localhost/en/p/x'), locale: 'en' });

    expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost/en/_missing');
    expect(response.headers.get('x-middleware-request-x-next-intl-locale')).toBe('en');
  });

  it('redirects permanently to the canonical path in the same locale with the query kept', () => {
    const response = canonicalRedirect({ request: new NextRequest('http://localhost/en/t/19969?period=30'), locale: 'en', path: '/t/object-140' });

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('http://localhost/en/t/object-140?period=30');
  });

  it('keeps the default locale unprefixed in the redirect', () => {
    const response = canonicalRedirect({ request: new NextRequest('http://localhost/t/19969'), locale: 'ru', path: '/t/object-140' });

    expect(response.headers.get('location')).toBe('http://localhost/t/object-140');
  });
});
