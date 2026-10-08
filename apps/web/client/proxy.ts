import type { NextRequest } from 'next/server';

import createMiddleware from 'next-intl/middleware';

import { canonicalRedirect, checkEntity, clientIpOf, isDocumentRequest, missingEntityRewrite, splitLocale } from '@/app/proxy/entity-presence';
import { routing } from '@/shared/i18n';

const intl = createMiddleware(routing);

export const proxy = async (request: NextRequest) => {
  const response = intl(request);

  if (!isDocumentRequest(request) || response.headers.has('location')) {
    return response;
  }

  const { locale, path } = splitLocale(request.nextUrl.pathname);
  const { isMissing, canonicalPath } = await checkEntity({ path, clientIp: clientIpOf(request) });

  if (isMissing) {
    return missingEntityRewrite({ request, locale });
  }

  return canonicalPath ? canonicalRedirect({ request, locale, path: canonicalPath }) : response;
};

export const config = {
  matcher: ['/((?!api|_next|_vercel|twitch-panel|.*\\..*).*)']
};
