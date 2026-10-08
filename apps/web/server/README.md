# @otmetki/server

The Три отметки backend, [api.triotmetki.ru](https://api.triotmetki.ru): NestJS 11 on Bun with Prisma 7 (+ Kysely), PostgreSQL 17 + TimescaleDB, Redis and BullMQ. Bun runs the TypeScript directly, so there is no build step. One image runs as two processes:

- **API** — `src/main.ts` (`AppModule`): the site API, the public API `/v1`, auth, the mod and manager endpoints, `/health`.
- **Worker** — `src/worker.ts` (`WorkerModule`): the collector, BullMQ jobs that pull the Lesta API into TimescaleDB through a shared rate limiter. It has no HTTP port; its heartbeat and the Lesta circuit state show in the API's `/health`.

## Features

- **Site API** for [apps/web/client](../client/README.md); its internal OpenAPI spec feeds the client's generated API client.
- **Public API `/v1`** with API keys, plan limits and Standard Webhooks; Scalar reference at `/v1/docs`, spec at `/v1/docs/openapi.json`; the TypeScript client is [`@otmetki/sdk`](../../../packages/sdk/README.md).
- **Auth** with better-auth: Lesta ID OpenID, Telegram, VK Mini App, magic link. Lesta credentials are never asked for.
- **Mod endpoints** (`/mod/*`): device binding, signed battle-result ingest, ratings for the HUD, profile sync, pack badges, problem reports.
- **Release feeds** (`/modpack/*`): the modpack release for a client version, the manager's self-update, the changelog, read from `downloads/releases.json`.
- **Bots and notifications:** Telegram, Discord and VK bots, web push, email (SMTP; Mailpit in development).
- **The collector:** players, clans, tanks and reference data from the Lesta API, retention and deletion purges.
- **Libraries in `src/lib`:** the Lesta API client ([README](src/lib/lesta/README.md)), the `.mtreplay` parser ([README](src/lib/replay/README.md)); the game-data importer is [src/modules/gamedata](src/modules/gamedata/README.md).

Outside production Swagger is at `/docs`; bull-board is at `/admin/queues` when `BULL_BOARD_PASSWORD` is set.

## Quick start

From the repo root, after `bun install` and `cp .env.example .env`:

```bash
bun run dev:infra   # TimescaleDB :5434, Redis :6380, Mailpit :1025
bun run db:push     # extensions, prisma db push, prisma generate, the Timescale layer (no migrations before production)
bun run dev:server  # the API on :4000 (nodemon); curl localhost:4000/health
bun run dev:worker  # the collector; logs "registered N of M job schedulers"
```

Without `LESTA_APPLICATION_ID` the server still boots, the worker runs degraded and endpoints answer empty.

### Environment

`src/config/env/env.schemas.ts` validates the environment at start. These secrets have no fallback and must be at least 32 characters (`openssl rand -base64 32`); production refuses the development values:

| Variable                  | Use                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`      | better-auth sessions; also salts the reporter and usage hashes                                                                                                |
| `INTERNAL_API_TOKEN`      | the Next server's calls to the API (the client reads the same value)                                                                                          |
| `TOKEN_ENCRYPTION_SECRET` | encrypts the stored Lesta and streamer integration tokens (`core/token-cipher`); rotating it makes them unreadable: Lesta links go stale, streamers reconnect |
| `MOD_INGEST_SECRET`       | the root of every mod device key (`modules/mod`); rotating it unbinds every device                                                                            |

Everything else (Lesta, bots, SMTP, YooKassa, streaming platforms, web push) is optional and documented in [.env.example](../../../.env.example). The production values are listed in [docs/ops/deploy.md](../../../docs/ops/deploy.md).

## Layout

| Path                            | What                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/main.ts` · `src/worker.ts` | the two entrypoints and their root modules                                                      |
| `src/config/`                   | `env/` (secrets, addresses, ports), app config, every tunable in `*.constants.ts`               |
| `src/core/`                     | infrastructure: Prisma (+ `$kysely`), Redis, logger, queues, Lesta, storage, HTTP, token cipher |
| `src/common/`                   | exceptions, filters, guards, middleware, decorators, interceptors, cache, pure helpers          |
| `src/lib/`                      | external clients: `lesta`, `replay`, `http` (ky), `auth` (better-auth), `scrape`                |
| `src/modules/`                  | one Nest module per feature; a `*-worker.module.ts` is the half the worker loads                |
| `prisma/`                       | `base.prisma`, `schema/*.prisma`, `sql/` (the Timescale layer, the reset script)                |
| `scripts/`                      | the CLI scripts below                                                                           |

The module list and the rules are in [CLAUDE.md](CLAUDE.md).

## Commands

Run from this folder (`bun run <script>`) or from the root with `bun --filter @otmetki/server <script>`; the root has shortcuts for `db:*` and `gamedata:import`.

| Script                                                   | What                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `dev` · `dev:worker`                                     | the API on :4000 · the collector, both under nodemon                                                         |
| `db:push` · `db:reset` · `db:deploy` · `db:studio`       | schema sync (dev) · drop and resync · the production sync (no generate) · Prisma Studio                      |
| `gamedata:import`                                        | vehicles, modules, equipment, maps and missions from the public client-data repos                            |
| `openapi:export`                                         | writes the OpenAPI specs (`/v1` for `@otmetki/sdk`, `internal` for the client); needs the database and Redis |
| `deletion:request -- --account <id> --reason "<ticket>"` | opens a Lesta data-deletion request for an account                                                           |
| `streamers:seed` · `armor:purge -- --yes`                | load the invited streamer list · delete every stored armor model (the kill switch)                           |
| `start` · `start:worker`                                 | production entrypoints                                                                                       |

`scripts/modpack-release.ts` is run by [release.yml](../../../.github/workflows/release.yml) to build the release payload the workflow signs and the published `releases.json`.

## Testing

```bash
bun run test                     # from the repo root: Vitest unit suites (never `bun test`)
bunx vitest run apps/web/server  # only the server
bun run test:db                  # query suites (*.db.test.ts) against a throwaway database on the dev:infra TimescaleDB
```

Tests live in `_tests/` next to the source; services mock Prisma with `mockPrismaService`. `src/_tests/import-cycles.test.ts` keeps the runtime import graph acyclic.

## Deploy

The [deploy workflow](../../../.github/workflows/deploy.yml) builds one image from [Dockerfile](Dockerfile); [docker-compose.yml](../../../docker-compose.yml) runs it as `server` (`bun src/main.ts`) and `worker` (`bun src/worker.ts`). Before `up -d` the rollout runs `db:deploy`. Replays and armor models live on the `serverdata` volume (`.data/`); `downloads/` is the VPS release folder, mounted read-only. Details: [docs/ops/deploy.md](../../../docs/ops/deploy.md).

## Data retention and deletion

Lesta's terms require honouring retention and deletion; the rules are part of the schema contract.

- **Retention:** every table that grows with time has a rule: the Timescale policies for hypertables, `RETENTION` in `modules/collector/purge/config` for the rest.
- **Deletion requests** (`data_deletion_request`, source `user` or `lesta`): deleting a site account opens a `user` request for every linked Lesta account in the same transaction; Lesta's requests go through `deletion:request`. An open request hides the player at once and blocks collection; the `purge` job then deletes the account's hypertable rows and its relational rows. A failed purge is retried, then marked `failed` and dispatched again after a cooldown.
- **Re-link after deletion:** signing in with Lesta ID again is new consent. Every `user` request of that account becomes `superseded`, and when no `lesta` request stands the player is unhidden and tracked again. A `lesta` request stays in force. A purge already running sees the superseded request and keeps the relational rows (hypertable rows already deleted stay deleted).

More in [docs/guides/server/data.md](../../../docs/guides/server/data.md#retention) and [docs/guides/server/collector.md](../../../docs/guides/server/collector.md).

## Docs

- [CLAUDE.md](CLAUDE.md): layout, the rules that bite, verification.
- [docs/guides/server/](../../../docs/guides/server/nestjs.md): modules and routes, [what each module owns](../../../docs/guides/server/modules.md), [queries](../../../docs/guides/server/queries.md), [data](../../../docs/guides/server/data.md), [the collector](../../../docs/guides/server/collector.md).
- [docs/research/data/lesta-api.md](../../../docs/research/data/lesta-api.md): the Lesta API and its terms.

## Licence

Proprietary, see [LICENSE](../../../LICENSE). The replay parser carries third-party format knowledge and fixtures under MIT: [src/lib/replay/NOTICE](src/lib/replay/NOTICE).
