import { describe, expect, it } from 'vitest';

import type { LestaOutcome } from '../../outcome/outcome.types';

import { createFetchMock, FAST_RETRY, lestaError, ok } from '../../_tests/fixtures';
import { LESTA_ERROR_CODE } from '../../errors/errors.constants';
import { LestaApiError, LestaHttpError, LestaNetworkError, LestaNotConfiguredError } from '../../errors/lesta-api-error';
import { createLestaClient } from '../client';

const APPLICATION_ID = 'test-app';

describe('lesta requester', () => {
  it('sends application id, language and joined list params as a form body', async () => {
    const { fetch, calls } = createFetchMock(() => ok([{ account_id: 1, nickname: 'Straik' }]));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, language: 'en' });

    const result = await client.account.list({ search: 'Stra', limit: 5 });

    expect(result).toEqual([{ account_id: 1, nickname: 'Straik' }]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.tanki.su/wot/account/list/');
    expect(calls[0]?.params).toEqual({ application_id: APPLICATION_ID, language: 'en', search: 'Stra', limit: '5' });
  });

  it('never calls Lesta without an application id', async () => {
    const { fetch, calls } = createFetchMock(() => ok([]));
    const client = createLestaClient({ applicationId: '', fetch });

    await expect(client.account.list({ search: 'abc' })).rejects.toBeInstanceOf(LestaNotConfiguredError);
    expect(calls).toHaveLength(0);
  });

  it('lets a call override the default language and access token', async () => {
    const { fetch, calls } = createFetchMock(() => ok([]));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, accessToken: 'default-token' });

    await client.account.list({ search: 'abc', language: 'en', accessToken: 'call-token' });

    expect(calls[0]?.params.language).toBe('en');
    expect(calls[0]?.params.access_token).toBe('call-token');
  });

  it('maps an error envelope to a typed LestaApiError with code, field and value', async () => {
    const { fetch } = createFetchMock(() => lestaError({ code: 407, message: 'INVALID_APPLICATION_ID', field: 'application_id', value: 'demo' }));
    const client = createLestaClient({ applicationId: 'demo', fetch, retry: FAST_RETRY });

    const failure = await client.account.list({ search: 'abc' }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LestaApiError);

    expect(failure).toMatchObject({
      code: LESTA_ERROR_CODE.invalidApplicationId,
      status: 407,
      field: 'application_id',
      value: 'demo',
      method: 'account/list'
    });
  });

  it('does not retry a non-retryable Lesta error', async () => {
    const { fetch, calls } = createFetchMock(() => lestaError({ code: 407, message: 'INVALID_APPLICATION_ID' }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, retry: FAST_RETRY });

    await expect(client.account.list({ search: 'abc' })).rejects.toBeInstanceOf(LestaApiError);
    expect(calls).toHaveLength(1);
  });

  it.each([
    ['REQUEST_LIMIT_EXCEEDED', () => lestaError({ code: 407, message: LESTA_ERROR_CODE.requestLimitExceeded })],
    ['SOURCE_NOT_AVAILABLE', () => lestaError({ code: 504, message: LESTA_ERROR_CODE.sourceNotAvailable })],
    ['HTTP 502', () => ({ status: 502, body: 'Bad Gateway' })],
    ['a network error', () => new TypeError('fetch failed')]
  ])('retries after %s and then succeeds', async (_label, failure) => {
    let attempt = 0;
    const { fetch, calls } = createFetchMock(() => {
      attempt += 1;

      return attempt < 3 ? failure() : ok([]);
    });

    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, retry: FAST_RETRY });

    await expect(client.account.list({ search: 'abc' })).resolves.toEqual([]);
    expect(calls).toHaveLength(3);
  });

  it('gives up once the retry budget is spent', async () => {
    const { fetch, calls } = createFetchMock(() => ({ status: 503, body: 'Service Unavailable' }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, retry: FAST_RETRY });

    await expect(client.account.list({ search: 'abc' })).rejects.toBeInstanceOf(LestaHttpError);
    expect(calls).toHaveLength(FAST_RETRY.retries + 1);
  });

  it('wraps a fetch rejection in LestaNetworkError', async () => {
    const { fetch } = createFetchMock(() => new TypeError('fetch failed'));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, retry: { ...FAST_RETRY, retries: 0 } });

    await expect(client.account.list({ search: 'abc' })).rejects.toBeInstanceOf(LestaNetworkError);
  });

  it('does not retry HTTP 4xx other than 429', async () => {
    const { fetch, calls } = createFetchMock(() => ({ status: 404, body: 'Not Found' }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, retry: FAST_RETRY });

    await expect(client.account.list({ search: 'abc' })).rejects.toMatchObject({ status: 404 });
    expect(calls).toHaveLength(1);
  });

  it.each([
    { reason: 'a payload that does not match the schema', reply: ok([{ account_id: 'not-a-number' }]) },
    { reason: 'a non-JSON body', reply: { body: undefined } }
  ])('rejects $reason with INVALID_RESPONSE', async ({ reply }) => {
    const { fetch } = createFetchMock(() => reply);
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, retry: FAST_RETRY });

    await expect(client.account.list({ search: 'abc' })).rejects.toMatchObject({ code: LESTA_ERROR_CODE.invalidResponse });
  });

  it('acquires a rate limiter token before every attempt', async () => {
    let acquired = 0;
    let attempt = 0;
    const { fetch } = createFetchMock(() => {
      attempt += 1;

      return attempt === 1 ? lestaError({ code: 407, message: LESTA_ERROR_CODE.requestLimitExceeded }) : ok([]);
    });

    const rateLimiter = {
      acquire: async () => {
        acquired += 1;
      }
    };

    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, retry: FAST_RETRY, rateLimiter });

    await client.account.list({ search: 'abc' });

    expect(acquired).toBe(attempt);
  });

  it('refuses more than 100 fields before sending anything', async () => {
    const { fetch, calls } = createFetchMock(() => ok({}));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });
    const fields = Array.from({ length: 101 }, (_, index) => `field_${index}`);

    await expect(client.account.info({ accountIds: [1], fields })).rejects.toBeInstanceOf(RangeError);
    expect(calls).toHaveLength(0);
  });

  it('reports each attempt outcome, a rate-limit envelope and a network failure as degraded', async () => {
    const replies = [lestaError({ code: 407, message: LESTA_ERROR_CODE.requestLimitExceeded }), ok([])];
    const { fetch } = createFetchMock(() => replies.shift() ?? ok([]));
    const outcomes: LestaOutcome[] = [];
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch, retry: FAST_RETRY, onOutcome: (outcome) => outcomes.push(outcome) });

    await client.account.list({ search: 'abc' });

    const offline = createLestaClient({
      applicationId: APPLICATION_ID,
      fetch: createFetchMock(() => new Error('ECONNRESET')).fetch,
      retry: { ...FAST_RETRY, retries: 0 },
      onOutcome: (outcome) => outcomes.push(outcome)
    });

    await expect(offline.account.list({ search: 'abc' })).rejects.toBeInstanceOf(LestaNetworkError);
    expect(outcomes).toEqual(['degraded', 'ok', 'degraded']);
  });
});
