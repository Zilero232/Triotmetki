# @otmetki/server

The Three Marks backend: NestJS 11 on Bun with Prisma 7, PostgreSQL 17 + TimescaleDB, Redis and BullMQ. Bun runs the TypeScript directly, there is no build step. One image, two processes:

- `src/main.ts` (`AppModule`): the site API, the public API `/v1` (reference at `/v1/docs`, spec at `/v1/docs/openapi.json`), auth (better-auth: Lesta ID OpenID, Telegram, VK Mini App, magic link), the mod ingest, `/health`, Swagger at `/docs` outside production and bull-board at `/admin/queues` when `BULL_BOARD_PASSWORD` is set.
- `src/worker.ts` (`WorkerModule`): the collector, BullMQ jobs that pull the Lesta API into TimescaleDB through a shared rate limiter. It has no HTTP port; its heartbeat and the Lesta circuit state show in the API's `/health`.

The code map, module list and rules are in [CLAUDE.md](CLAUDE.md); the code style in [docs/guides/server](../../../docs/guides/server/nestjs.md).

## Run

From the repo root, after `bun install` and `cp .env.example .env`:

```bash
bun run dev:infra   # TimescaleDB :5434, Redis :6380, Mailpit :1025
bun run db:push     # extensions, prisma db push, prisma generate, the Timescale layer (no migrations before production)
bun run dev:server  # the API on :4000 (nodemon)
bun run dev:worker  # the collector
```

Without `LESTA_APPLICATION_ID` the server still boots and the worker runs degraded; pages show their empty states.

### Environment

`src/config/env/env.schemas.ts` validates the environment at start. These secrets have no fallback and must be at least 32 characters (`openssl rand -base64 32`); production refuses the development values:

| Variable                  | Use                                                                                                                                                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`      | better-auth sessions; also salts the reporter and usage hashes                                                                                                                                                                                                         |
| `INTERNAL_API_TOKEN`      | the Next server's calls to the API (the client reads the same value)                                                                                                                                                                                                   |
| `TOKEN_ENCRYPTION_SECRET` | encrypts tokens stored outside better-auth (`user_lesta_account.access_token`, the streamer integrations' access and refresh tokens) with `TokenCipherService` (`core/token-cipher`). Rotating it makes them unreadable: Lesta links go stale and streamers reconnect. |
| `MOD_INGEST_SECRET`       | the root of every mod device key (`modules/mod`); rotating it unbinds every device                                                                                                                                                                                     |

Everything else (Lesta, bots, SMTP, YooKassa, streaming platforms, web push) is optional and documented in [.env.example](../../../.env.example). The production values are listed in [docs/ops/deploy.md](../../../docs/ops/deploy.md).

## Scripts

| Script                                                   | What                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `db:push` · `db:reset` · `db:deploy` · `db:studio`       | schema sync (dev), drop and resync, the production sync (no generate), Prisma Studio                         |
| `gamedata:import`                                        | vehicles, modules, equipment, maps and missions from the public client-data repos                            |
| `openapi:export`                                         | writes the OpenAPI specs (`/v1` for `@otmetki/sdk`, `internal` for the client); needs the database and Redis |
| `deletion:request -- --account <id> --reason "<ticket>"` | opens a Lesta data-deletion request for an account                                                           |
| `streamers:seed` · `armor:purge -- --yes`                | load the invited streamer list · delete every stored armor model (the kill switch)                           |
| `start` · `start:worker`                                 | production entrypoints                                                                                       |

`scripts/modpack-release.ts` is run by [release.yml](../../../.github/workflows/release.yml) to build the published release index.

## Data retention and deletion

Lesta's terms require honouring retention and deletion; the rules are part of the schema contract.

- **Retention:** every table that grows with time has a rule: the Timescale policies for hypertables, `RETENTION` in `modules/collector/purge/config` for the rest.
- **Deletion requests** (`data_deletion_request`, source `user` or `lesta`): deleting a site account opens a `user` request for every linked Lesta account in the same transaction; Lesta's requests go through `deletion:request`. An open request hides the player at once and blocks collection; the `purge` job then deletes the account's hypertable rows and its relational rows. A failed purge is retried, then marked `failed` and dispatched again after a cooldown.
- **Re-link after deletion:** signing in with Lesta ID again is new consent. Every `user` request of that account becomes `superseded`, and when no `lesta` request stands the player is unhidden and tracked again. A `lesta` request stays in force. A purge already running sees the superseded request and keeps the relational rows (hypertable rows already deleted stay deleted).

## Tests

```bash
bun run test                     # from the repo root (Vitest, never `bun test`)
bunx vitest run apps/web/server  # only the server
```

Tests live in `_tests/` next to the source. `bun run typecheck` in this folder runs `tsc --noEmit`.

## Licence

Proprietary, see [LICENSE](../../../LICENSE). The replay parser carries third-party format knowledge and fixtures under MIT: [src/lib/replay/NOTICE](src/lib/replay/NOTICE).
