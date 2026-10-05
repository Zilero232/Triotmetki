import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';
import type { Request } from 'express';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../config';

import { AppForbiddenException } from '../../exceptions';
import { CROSS_ORIGIN } from '../../lib/cross-origin/cross-origin.constants';
import { OriginGuard } from '../origin.guard';

const WEB = 'https://triotmetki.ru';
const API = 'https://api.triotmetki.ru';
const EXTRA = 'https://studio.triotmetki.ru';
const SESSION = `${CROSS_ORIGIN.sessionCookie}=abc.def`;

const createGuard = () => {
  const config = mock<AppConfigService>();

  config.get.calledWith('WEB_URL').mockReturnValue(`${WEB}/ru`);
  config.get.calledWith('API_URL').mockReturnValue(`${API}/`);
  config.get.calledWith('CORS_ORIGINS').mockReturnValue(` ${EXTRA} ,`);

  return new OriginGuard(config);
};

const httpContext = (request: Pick<Request, 'headers' | 'method'>) => {
  const http = mock<HttpArgumentsHost>();
  const context = mock<ExecutionContext>();

  http.getRequest.mockReturnValue(request);
  context.getType.mockReturnValue('http');
  context.switchToHttp.mockReturnValue(http);

  return context;
};

const post = (headers: Request['headers']) => httpContext({ method: 'POST', headers });

describe('OriginGuard', () => {
  it('passes a non-HTTP context without reading a request', () => {
    const context = mock<ExecutionContext>();

    context.getType.mockReturnValue('rpc');

    expect(createGuard().canActivate(context)).toBe(true);
    expect(context.switchToHttp).not.toHaveBeenCalled();
  });

  it.each([WEB, API, EXTRA])('lets a cookie-carrying write from %s through', (origin) => {
    expect(createGuard().canActivate(post({ origin, cookie: SESSION }))).toBe(true);
  });

  it('refuses a cookie-carrying write from a foreign origin with a forbidden error', () => {
    expect(() => createGuard().canActivate(post({ origin: 'https://evil.example', cookie: SESSION }))).toThrow(AppForbiddenException);
  });

  it('refuses a cookie-carrying write the browser marks cross-site when no origin is sent', () => {
    expect(() => createGuard().canActivate(post({ 'sec-fetch-site': CROSS_ORIGIN.crossSite, cookie: SESSION }))).toThrow(AppForbiddenException);
  });

  it('lets a foreign read through even with the session cookie', () => {
    expect(createGuard().canActivate(httpContext({ method: 'GET', headers: { origin: 'https://evil.example', cookie: SESSION } }))).toBe(true);
  });
});
