import type { ArgumentsHost } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';
import type { Request, Response } from 'express';

import { HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { Prisma } from '../../../../../generated';
import { LestaHttpError, LestaNetworkError, LestaNotConfiguredError, LestaQueueFullError } from '../../../../lib/lesta';
import { AppNotFoundException, ModException } from '../../../exceptions';
import { MOD_REPLY } from '../all-exceptions.constants';
import { AllExceptionsFilter } from '../all-exceptions.filter';

const [modPath] = MOD_REPLY.contractPaths;

const zodError = () => {
  const result = z.object({ nickname: z.string() }).safeParse({ nickname: 1 });

  if (result.success) {
    throw new Error('the fixture schema must fail');
  }

  return result.error;
};

const prismaError = (code: string) => new Prisma.PrismaClientKnownRequestError('query failed', { code, clientVersion: 'test' });

const reply = (exception: unknown, { path = '/players', retryAfter }: { path?: string; retryAfter?: string } = {}) => {
  const response = mock<Response>();
  const http = mock<HttpArgumentsHost>();
  const host = mock<ArgumentsHost>();

  response.status.mockReturnValue(response);
  response.getHeader.mockReturnValue(retryAfter);
  http.getRequest.mockReturnValue(mock<Request>({ path }));
  http.getResponse.mockReturnValue(response);
  host.switchToHttp.mockReturnValue(http);

  new AllExceptionsFilter().catch(exception, host);

  return {
    status: response.status.mock.calls[0]?.[0],
    body: response.json.mock.calls[0]?.[0],
    headers: new Map(response.setHeader.mock.calls.map(([name, value]) => [name, value]))
  };
};

describe('AllExceptionsFilter on the API', () => {
  it('reports validation issues with their paths', () => {
    const { status, body } = reply(new ZodValidationException(zodError()));

    expect(status).toBe(HttpStatus.BAD_REQUEST);
    expect(body).toMatchObject({ code: 'VALIDATION_FAILED', issues: [expect.objectContaining({ path: ['nickname'] })] });
  });

  it('tells a throttled client when to retry, rounded up to whole seconds', () => {
    const { status, body } = reply(new ThrottlerException(), { retryAfter: '1.2' });

    expect(status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(body).toEqual({ error: 'Too many requests', code: 'RATE_LIMITED', retryAfterSec: 2 });
  });

  it('omits the retry hint when the throttler gave none', () => {
    const { body } = reply(new ThrottlerException());

    expect(body).not.toHaveProperty('retryAfterSec');
  });

  it('hides a response that failed its own schema behind a generic error', () => {
    const { status, body } = reply(new ZodSerializationException(zodError()));

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body).toEqual({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  it('passes through an app exception that already carries a code', () => {
    const { status, body } = reply(new AppNotFoundException('PLAYER_NOT_FOUND', 'No player'));

    expect(status).toBe(HttpStatus.NOT_FOUND);
    expect(body).toMatchObject({ code: 'PLAYER_NOT_FOUND' });
  });

  it.each([
    ['unique violation', 'P2002', HttpStatus.CONFLICT, 'CONFLICT'],
    ['missing record', 'P2025', HttpStatus.NOT_FOUND, 'NOT_FOUND']
  ])('maps a Prisma %s to its HTTP status', (_, code, expectedStatus, expectedCode) => {
    const { status, body } = reply(prismaError(code));

    expect(status).toBe(expectedStatus);
    expect(body).toEqual({ error: expectedCode, code: expectedCode });
  });

  it('treats an unmapped Prisma error as an internal error', () => {
    const { status, body } = reply(prismaError('P2034'));

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body).toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it.each([
    ['HTTP', new LestaHttpError({ method: 'account/info', status: 404 })],
    ['network', new LestaNetworkError({ method: 'account/info', cause: new Error('ETIMEDOUT') })],
    ['queue-full', new LestaQueueFullError({ key: 'global', cause: new Error('queue is full') })]
  ])('reports a Lesta %s failure as Lesta being unavailable, not as its own status', (_, error) => {
    const { status, body } = reply(error);

    expect(status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(body).toMatchObject({ code: 'LESTA_UNAVAILABLE' });
  });

  it('answers integration-unavailable with a not-found status while no Lesta application id is set', () => {
    const { status, body } = reply(new LestaNotConfiguredError({ method: 'account/list' }));

    expect(status).toBe(HttpStatus.NOT_FOUND);
    expect(body).toEqual({ error: 'Lesta API is not connected', code: 'INTEGRATION_UNAVAILABLE' });
  });

  it('keeps the client error status set by a middleware', () => {
    const { status, body } = reply(Object.assign(new Error('request entity too large'), { status: HttpStatus.PAYLOAD_TOO_LARGE }));

    expect(status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('never echoes the internal message of a middleware client error', () => {
    const { body } = reply(Object.assign(new Error('Unexpected token } in JSON at position 7 of /srv/app'), { status: HttpStatus.BAD_REQUEST }));

    expect(JSON.stringify(body)).not.toContain('/srv/app');
  });

  it('never leaks the message of an unknown error', () => {
    const { status, body } = reply(new Error('password=hunter2'));

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('treats a thrown non-error value as an internal error', () => {
    expect(reply('boom').status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});

describe('AllExceptionsFilter on the mod contract', () => {
  it('passes a mod error body through unchanged', () => {
    const { status, body } = reply(new ModException({ status: HttpStatus.GONE, error: 'code_expired' }), { path: modPath });

    expect(status).toBe(HttpStatus.GONE);
    expect(body).toEqual({ error: 'code_expired' });
  });

  it('tells a mod with a skewed clock the server time so it can re-sign', () => {
    const { status, headers } = reply(new ModException({ status: HttpStatus.PRECONDITION_REQUIRED, error: 'stale_request' }), { path: modPath });

    expect(status).toBe(HttpStatus.PRECONDITION_REQUIRED);
    expect(Number(headers.get(MOD_REPLY.serverTimeHeader))).toBeCloseTo(Date.now() / 1000, -1);
  });

  it('sends the server time on the signed settings routes too', () => {
    const { headers } = reply(new ModException({ status: HttpStatus.PRECONDITION_REQUIRED, error: 'stale_request' }), {
      path: '/mod/settings/apply/poll'
    });

    expect(headers.has(MOD_REPLY.serverTimeHeader)).toBe(true);
  });

  it('sends the server time on a mod replay upload error', () => {
    const { headers } = reply(new ModException({ status: HttpStatus.PRECONDITION_REQUIRED, error: 'stale_request' }), { path: '/replays/mod' });

    expect(Number(headers.get(MOD_REPLY.serverTimeHeader))).toBeCloseTo(Date.now() / 1000, -1);
  });

  it('keeps the mod error of a replay upload next to the API code', () => {
    const { status, body } = reply(new ModException({ status: HttpStatus.UNPROCESSABLE_ENTITY, error: 'replay_not_owned' }), {
      path: '/replays/mod'
    });

    expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(body).toEqual({ error: 'replay_not_owned', code: 'VALIDATION_FAILED' });
  });

  it('keeps the server time off the site replay upload', () => {
    expect(reply(new AppNotFoundException('NOT_FOUND', 'No replay'), { path: '/replays' }).headers.size).toBe(0);
  });

  it('keeps the server time off the site API', () => {
    expect(reply(new AppNotFoundException('PLAYER_NOT_FOUND', 'No player')).headers.size).toBe(0);
  });

  it('translates a regular HTTP error into the mod vocabulary', () => {
    const { status, body } = reply(new ZodValidationException(zodError()), { path: modPath });

    expect(status).toBe(HttpStatus.BAD_REQUEST);
    expect(body).toEqual({ error: 'invalid_payload' });
  });

  it('keeps a middleware client error in the mod vocabulary', () => {
    const { status, body } = reply(Object.assign(new Error('too large'), { statusCode: HttpStatus.PAYLOAD_TOO_LARGE }), { path: modPath });

    expect(status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(body).toEqual({ error: 'too_large' });
  });

  it('answers any other failure with a bare server error', () => {
    const { status, body } = reply(prismaError('P2002'), { path: modPath });

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body).toEqual({ error: 'server_error' });
  });
});
