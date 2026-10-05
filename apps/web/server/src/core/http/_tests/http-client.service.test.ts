import { HTTPError, SchemaValidationError } from 'ky';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { HttpClientService } from '../http-client.service';

const URL = 'https://example.test/data.json';
const itemSchema = z.object({ id: z.number(), name: z.string() });

const replies = (...responses: (() => Response)[]) => {
  const calls: string[] = [];
  const fetch = async (input: string | Request | URL) => {
    calls.push(input instanceof Request ? input.url : String(input));

    const next = responses[Math.min(calls.length - 1, responses.length - 1)];

    return next ? next() : new Response(null, { status: 500 });
  };

  return { fetch, calls };
};

describe('HttpClientService.getJson', () => {
  it('returns the body parsed by the schema', async () => {
    const { fetch } = replies(() => Response.json({ id: 1, name: 'T-34', extra: true }));

    const item = await new HttpClientService().getJson({ url: URL, schema: itemSchema, options: { fetch } });

    expect(item).toEqual({ id: 1, name: 'T-34' });
  });

  it('throws a schema validation error when the body does not match', async () => {
    const { fetch } = replies(() => Response.json({ id: 'one' }));

    await expect(new HttpClientService().getJson({ url: URL, schema: itemSchema, options: { fetch } })).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('retries a failing request by default before giving up on it', async () => {
    const { fetch, calls } = replies(
      () => new Response(null, { status: 503 }),
      () => Response.json({ id: 2, name: 'IS-7' })
    );

    const item = await new HttpClientService().getJson({ url: URL, schema: itemSchema, options: { fetch } });

    expect(item).toEqual({ id: 2, name: 'IS-7' });
    expect(calls).toHaveLength(2);
  });

  it('keeps the unparsed single-attempt read for callers that pass no schema', async () => {
    const { fetch, calls } = replies(() => new Response(null, { status: 503 }));

    await expect(new HttpClientService().getJson({ url: URL, options: { fetch } })).rejects.toBeInstanceOf(HTTPError);
    expect(calls).toHaveLength(1);
  });
});
