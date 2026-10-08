import type { NextRequest } from 'next/server';

import { INTERNAL_REQUEST } from '@otmetki/schemas';
import { NextResponse } from 'next/server';
import { isIncludedIn } from 'remeda';

import { isNotFoundError } from '@/shared/api/source';
import { DEFAULT_LOCALE, LOCALES } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';

import type {
  CanonicalPathInput,
  CanonicalRedirectInput,
  EntityCheck,
  EntityCheckInput,
  LocalizedPath,
  MissingEntityRewriteInput,
  ResolveLookupInput
} from './entity-presence.types';

import { ENTITY_FOUND, ENTITY_LOOKUPS, ENTITY_PRESENCE } from './entity-presence.constants';

export const isDocumentRequest = (request: NextRequest) =>
  request.method === 'GET' && (request.headers.get('accept') ?? '').includes(ENTITY_PRESENCE.htmlAccept);

export const splitLocale = (pathname: string): LocalizedPath => {
  const [, first = '', ...rest] = pathname.split('/');

  return isIncludedIn(first, LOCALES) ? { locale: first, path: `/${rest.join('/')}` } : { locale: DEFAULT_LOCALE, path: pathname };
};

export const clientIpOf = (request: NextRequest): string | null => {
  const first = request.headers.get(ENTITY_PRESENCE.forwardedForHeader)?.split(ENTITY_PRESENCE.forwardedForSeparator)[0]?.trim();

  return first === undefined || first === '' ? null : first;
};

const canonicalPathOf = ({ path, rawKey, canonicalKey }: CanonicalPathInput): string | null => {
  if (decodeRouteParam(rawKey) === canonicalKey) {
    return null;
  }

  const keyStart = path.indexOf('/', 1) + 1;
  const keyEnd = keyStart + rawKey.length;

  return `${path.slice(0, keyStart)}${encodeURIComponent(canonicalKey)}${path.slice(keyEnd)}`;
};

const resolveLookup = async ({ lookup, rawKey, path, headers }: ResolveLookupInput): Promise<EntityCheck> => {
  const key = decodeRouteParam(rawKey);

  try {
    const canonicalKey = await lookup.canonicalKey({ key, signal: AbortSignal.timeout(ENTITY_PRESENCE.timeoutMs), headers });
    const canonicalPath = canonicalKey === null ? null : canonicalPathOf({ path, rawKey, canonicalKey });

    return { isMissing: false, canonicalPath };
  } catch (error) {
    return { isMissing: isNotFoundError(error), canonicalPath: null };
  }
};

export const checkEntity = async ({ path, clientIp }: EntityCheckInput): Promise<EntityCheck> => {
  const headers: Record<string, string> = clientIp ? { [INTERNAL_REQUEST.clientIpHeader]: clientIp } : {};

  for (const lookup of ENTITY_LOOKUPS) {
    const rawKey = lookup.pattern.exec(path)?.[1];

    if (rawKey !== undefined) {
      return resolveLookup({ lookup, rawKey, path, headers });
    }
  }

  return ENTITY_FOUND;
};

export const missingEntityRewrite = ({ request, locale }: MissingEntityRewriteInput) => {
  const headers = new Headers(request.headers);

  headers.set(ENTITY_PRESENCE.localeHeader, locale);

  return NextResponse.rewrite(new URL(`/${locale}/${ENTITY_PRESENCE.missingSegment}`, request.url), { request: { headers } });
};

export const canonicalRedirect = ({ request, locale, path }: CanonicalRedirectInput) => {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const target = new URL(`${prefix}${path}${request.nextUrl.search}`, request.url);

  return NextResponse.redirect(target, ENTITY_PRESENCE.redirectStatus);
};
