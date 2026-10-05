# @otmetki/sdk

TypeScript client for the Three Marks public API (`/v1`). The functions and types are generated from the OpenAPI spec with [`@hey-api/openapi-ts`](https://heyapi.dev); the generated client runs on [`ky`](https://github.com/sindresorhus/ky), a small wrapper adds the API key, the base URL and retries, and `verifyWebhook` checks webhook deliveries with [Standard Webhooks](https://www.standardwebhooks.com).

Create a key in the site's developer page (`/me/developer`). The key is shown once. Interactive docs live at `/v1/docs`, the raw spec at `/v1/docs/openapi.json`.

## Usage

```ts
import { createOtmetkiClient, getPlayer, getTierList, listPlayerTanks } from '@otmetki/sdk';

const client = createOtmetkiClient({
  apiKey: process.env.OTMETKI_API_KEY!,
  baseUrl: 'https://api.triotmetki.ru'
});

const { data: player } = await getPlayer({ client, path: { idOrNick: 'Tanker' }, throwOnError: true });

const { data: tanks } = await listPlayerTanks({
  client,
  path: { id: player.summary.accountId },
  query: { tiers: [10], sort: 'wn8', limit: 'all' },
  throwOnError: true
});

const { data: tierList } = await getTierList({ client, query: { mode: 'random', period: '7d' }, throwOnError: true });
```

Every function takes `{ client, path, query }` and returns `{ data, error, request, response }`. Pass `throwOnError: true` to get `data` typed as the success body and have the API error (`{ error, code }`) thrown instead.

Units: every rate (`winRate`, `survivalRate`, `accuracy`) is a percent from 0 to 100; `winRateDiff` and `winRateDelta` are percentage points.

### Retries

Requests answered with 408, 425, 429 or 5xx, and network failures, are retried up to three times by ky with exponential backoff, honouring `Retry-After` on 413, 429 and 503 (up to a minute). The `retry` option takes [ky's retry options](https://github.com/sindresorhus/ky#retry) and is merged over the defaults (`OTMETKI_RETRY`):

```ts
createOtmetkiClient({ apiKey, retry: { limit: 5, backoffLimit: 30_000 } });
createOtmetkiClient({ apiKey, retry: false });
```

### Limits

| Plan      | Requests per second | Requests per day | Webhook endpoints |
| --------- | ------------------- | ---------------- | ----------------- |
| Free      | 5                   | 10 000           | 1                 |
| Plus      | 10                  | 50 000           | 5                 |
| Community | 100                 | 2 000 000        | 50                |

Paginated lists take `limit` (1–100, default 25) and `offset` (0–10 000); a larger value is rejected with 400. Past the 10 000th row, narrow the query with filters instead of paging deeper.

Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Daily-Limit` and `X-RateLimit-Daily-Remaining`. Over the limit the API answers 429 with `RATE_LIMITED` (per second) or `PLAN_LIMIT_REACHED` (per day) and a `Retry-After` header.

### Webhooks

Endpoints are managed in `/me/developer`; each one follows players (`accountIds`) and/or clans (`clanIds`) and receives `mark.gained`, `session.ended` and `clan.member_changed`. A delivery is a JSON `POST` signed per [Standard Webhooks](https://www.standardwebhooks.com) with the endpoint secret (`whsec_…`, shown once): the `webhook-id` (the delivery id, stable across retries), `webhook-timestamp` and `webhook-signature` headers, plus `X-Otmetki-Event`.

Any Standard Webhooks library verifies it — `npm i standardwebhooks`, `pip install standardwebhooks`, or the Go, Ruby, PHP, Rust, Java and C# ports. The SDK re-exports the JavaScript one:

```ts
import { verifyWebhook, WebhookVerificationError } from '@otmetki/sdk';

app.post('/otmetki', async (request, reply) => {
  try {
    const { event, data } = verifyWebhook({ secret: process.env.OTMETKI_WEBHOOK_SECRET!, body: request.rawBody, headers: request.headers });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return reply.code(401).send();
    }

    throw error;
  }
});
```

```python
from standardwebhooks import Webhook

payload = Webhook(secret).verify(raw_body, headers)
```

Verify the raw body exactly as received. Deliveries older than five minutes are rejected. A failed delivery is tried up to six times in all, with exponential backoff; twenty failed deliveries in a row switch the endpoint off.

## Regenerating

The committed spec is `openapi/v1.json`; the generated code in `src/generated` is git-ignored and rebuilt on `bun install`.

```bash
bun run --filter @otmetki/sdk sdk:generate                                   # export the spec from the server code, format it, regenerate
OTMETKI_OPENAPI_URL=http://localhost:4000/v1/docs/openapi.json bun run --filter @otmetki/sdk sdk:generate:live   # from a running server
```

`sdk:generate` runs the server's `openapi:export` script, which boots the Nest application without an HTTP port (it needs the database and Redis from `bun run dev:infra`).

## Licence

MIT, see [LICENSE](LICENSE). The rest of the repository is proprietary ([../../LICENSE](../../LICENSE)).

The package is still `"private": true` and exports TypeScript sources; publishing it to npm needs a build to JavaScript and a `publishConfig` first.
