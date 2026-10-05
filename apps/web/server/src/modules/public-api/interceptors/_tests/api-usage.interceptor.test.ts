import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';

import { HttpStatus } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AuthenticatedApiKey } from '../../../developer';
import type { ApiUsageWriterService } from '../../services/api-usage-writer.service';

import { AppNotFoundException } from '../../../../common/exceptions';
import { endpointLabel } from '../../lib/usage-counters/usage-counters';
import { ApiUsageInterceptor } from '../api-usage.interceptor';

const apiKey: AuthenticatedApiKey = { id: 'key', userId: 'user', tier: 'free', dailyLimit: 1000, dailyRemaining: 999 };
const ROUTE = '/v1/players/:id';

type RequestShape = { apiKey?: AuthenticatedApiKey; method: string; path: string; route?: { path: string } };

const contextFor = (request: RequestShape) => {
  const http = mock<HttpArgumentsHost>();
  const context = mock<ExecutionContext>();

  http.getRequest.mockReturnValue(request);
  context.switchToHttp.mockReturnValue(http);

  return context;
};

const handlerOf = (result: ReturnType<CallHandler['handle']>) => {
  const handler = mock<CallHandler>();

  handler.handle.mockReturnValue(result);

  return handler;
};

const request: RequestShape = { apiKey, method: 'get', path: '/v1/players/1', route: { path: ROUTE } };

const createInterceptor = () => {
  const usage = mock<ApiUsageWriterService>();

  return { usage, interceptor: new ApiUsageInterceptor(usage) };
};

describe('ApiUsageInterceptor', () => {
  it('does not record requests made without an API key', async () => {
    const { usage, interceptor } = createInterceptor();

    await firstValueFrom(interceptor.intercept(contextFor({ ...request, apiKey: undefined }), handlerOf(of('body'))));

    expect(usage.record).not.toHaveBeenCalled();
  });

  it('records a successful request against the route template, not the concrete path', async () => {
    const { usage, interceptor } = createInterceptor();

    expect(await firstValueFrom(interceptor.intercept(contextFor(request), handlerOf(of('body'))))).toBe('body');

    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: apiKey.id,
        endpoint: endpointLabel({ method: 'get', route: ROUTE }),
        failed: false,
        latencyMs: expect.any(Number)
      })
    );

    expect(usage.logError).not.toHaveBeenCalled();
  });

  it('groups requests that matched no route under the unmatched label', async () => {
    const { usage, interceptor } = createInterceptor();

    await firstValueFrom(interceptor.intercept(contextFor({ ...request, route: undefined }), handlerOf(of('body'))));

    expect(usage.record).toHaveBeenCalledWith(expect.objectContaining({ endpoint: endpointLabel({ method: 'get', route: undefined }) }));
  });

  it('records a failed request, logs its status and code, and rethrows the original error', async () => {
    const { usage, interceptor } = createInterceptor();
    const error = new AppNotFoundException('NOT_FOUND', 'Player not found');

    await expect(firstValueFrom(interceptor.intercept(contextFor(request), handlerOf(throwError(() => error))))).rejects.toBe(error);
    expect(usage.record).toHaveBeenCalledWith(expect.objectContaining({ keyId: apiKey.id, failed: true }));
    expect(usage.record).not.toHaveBeenCalledWith(expect.objectContaining({ failed: false }));

    expect(usage.logError).toHaveBeenCalledWith({
      keyId: apiKey.id,
      method: 'get',
      path: request.path,
      status: HttpStatus.NOT_FOUND,
      code: 'NOT_FOUND',
      message: error.message
    });
  });

  it('logs an unexpected crash as an internal error', async () => {
    const { usage, interceptor } = createInterceptor();

    await expect(firstValueFrom(interceptor.intercept(contextFor(request), handlerOf(throwError(() => new Error('boom')))))).rejects.toThrow('boom');

    expect(usage.logError).toHaveBeenCalledWith(
      expect.objectContaining({ status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'boom' })
    );
  });

  it('logs a null message when the thrown value is not an Error', async () => {
    const { usage, interceptor } = createInterceptor();

    await expect(firstValueFrom(interceptor.intercept(contextFor(request), handlerOf(throwError(() => 'string failure'))))).rejects.toBe(
      'string failure'
    );

    expect(usage.logError).toHaveBeenCalledWith(expect.objectContaining({ message: null }));
  });
});
