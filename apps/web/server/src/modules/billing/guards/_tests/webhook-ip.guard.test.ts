import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';

import { AppForbiddenException } from '../../../../common/exceptions';
import { WebhookIpGuard } from '../webhook-ip.guard';

const contextFor = (request: { ip?: string; socket: { remoteAddress?: string } }) => {
  const http = mock<HttpArgumentsHost>();
  const context = mock<ExecutionContext>();

  http.getRequest.mockReturnValue(request);
  context.switchToHttp.mockReturnValue(http);

  return context;
};

const guardFor = (nodeEnv: 'development' | 'production') => {
  const config = mock<AppConfigService>();

  config.get.mockReturnValue(nodeEnv);

  return new WebhookIpGuard(config);
};

describe('WebhookIpGuard', () => {
  it('lets YooKassa in', () => {
    expect(guardFor('production').canActivate(contextFor({ ip: '185.71.77.10', socket: {} }))).toBe(true);
  });

  it('rejects any other source with a forbidden error', () => {
    expect(() => guardFor('production').canActivate(contextFor({ ip: '8.8.8.8', socket: {} }))).toThrow(AppForbiddenException);
  });

  it('allows loopback for local testing outside production only', () => {
    expect(guardFor('development').canActivate(contextFor({ ip: '127.0.0.1', socket: {} }))).toBe(true);
    expect(() => guardFor('production').canActivate(contextFor({ ip: '127.0.0.1', socket: {} }))).toThrow(AppForbiddenException);
  });

  it('falls back to the socket address and rejects a request without one', () => {
    expect(guardFor('production').canActivate(contextFor({ socket: { remoteAddress: '::ffff:185.71.76.1' } }))).toBe(true);
    expect(() => guardFor('production').canActivate(contextFor({ socket: {} }))).toThrow(AppForbiddenException);
  });
});
