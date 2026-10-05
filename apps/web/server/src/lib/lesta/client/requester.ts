import ky from 'ky';
import pRetry from 'p-retry';
import { isNonNullish, pickBy } from 'remeda';

import type { LestaEnvelope } from '../schemas/common/common.types';
import type { LestaClientOptions, LestaRequester, LestaRequestInput, LestaResponse, ReadEnvelopeInput, SendInput } from './client.types';

import { LESTA_ERROR_CODE } from '../errors/errors.constants';
import { isRetryableLestaError, LestaApiError, LestaHttpError, LestaNetworkError, LestaNotConfiguredError } from '../errors/lesta-api-error';
import { classifyLestaResponse } from '../outcome/outcome';
import { noopRateLimiter } from '../rate-limit/rate-limiters';
import { lestaEnvelopeSchema } from '../schemas/common/common.schemas';
import { LESTA_API, LESTA_RETRY } from './client.constants';
import { toSearchParams } from './params/params';

const normalizeBaseUrl = (baseUrl: string): string => (baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);

const normalizeMethod = (method: string): string => `${method.replace(/\/+$/, '')}/`;

const readEnvelope = async ({ response, method, onOutcome }: ReadEnvelopeInput): Promise<LestaEnvelope> => {
  if (!response.ok) {
    onOutcome?.(classifyLestaResponse({ status: response.status, errorCode: null }));

    throw new LestaHttpError({ method, status: response.status, body: await response.text() });
  }

  const parsed = lestaEnvelopeSchema.safeParse(await response.json().catch(() => undefined));

  onOutcome?.(classifyLestaResponse({ status: response.status, errorCode: parsed.data?.status === 'error' ? parsed.data.error.message : null }));

  if (!parsed.success) {
    throw new LestaApiError({ code: LESTA_ERROR_CODE.invalidResponse, message: parsed.error.message, method });
  }

  return parsed.data;
};

export const createRequester = ({
  applicationId,
  baseUrl = LESTA_API.baseUrl,
  language = LESTA_API.language,
  accessToken,
  rateLimiter = noopRateLimiter,
  retry,
  timeoutMs = LESTA_API.timeoutMs,
  fetch,
  onOutcome
}: LestaClientOptions): LestaRequester => {
  const root = normalizeBaseUrl(baseUrl);
  const retryOptions = { ...LESTA_RETRY, ...retry };
  const api = ky.create({ prefix: root, timeout: timeoutMs, retry: 0, throwHttpErrors: false, fetch, headers: { accept: 'application/json' } });

  const send = async ({ method, params = {} }: SendInput): Promise<LestaEnvelope> => {
    if (applicationId === '') {
      throw new LestaNotConfiguredError({ method });
    }

    const body = toSearchParams({ application_id: applicationId, language, access_token: accessToken, ...pickBy(params, isNonNullish) });

    await rateLimiter.acquire();

    const response = await api.post(normalizeMethod(method), { body }).catch((error: unknown) => {
      onOutcome?.('degraded');

      throw new LestaNetworkError({ method, cause: error });
    });

    return readEnvelope({ response, method, onOutcome });
  };

  const sendChecked = async (input: SendInput) => {
    const envelope = await send(input);

    if (envelope.status === 'error') {
      const { code, message, field, value } = envelope.error;

      throw new LestaApiError({
        code: message,
        method: input.method,
        status: code,
        field,
        value: value === undefined || value === null ? value : String(value)
      });
    }

    return envelope;
  };

  const call = async <T>({ method, params, schema }: LestaRequestInput<T>): Promise<LestaResponse<T>> => {
    const envelope = await pRetry(() => sendChecked({ method, params }), {
      ...retryOptions,
      shouldRetry: ({ error }) => isRetryableLestaError(error)
    });

    const parsed = schema.safeParse(envelope.data);

    if (!parsed.success) {
      throw new LestaApiError({ code: LESTA_ERROR_CODE.invalidResponse, message: parsed.error.message, method });
    }

    return { data: parsed.data, meta: envelope.meta ?? {} };
  };

  return { call, applicationId, baseUrl: root };
};
