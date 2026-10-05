# CLAUDE.md — apps/web/server

Guidance for the server app. Extends the root [../../../CLAUDE.md](../../../CLAUDE.md); those rules still apply.

**NestJS 11 on Bun** + Prisma 7 (+ Kysely for SQL beyond Prisma Client) + PostgreSQL/TimescaleDB + Redis + BullMQ. Bun runs the TypeScript directly — no build step. One image, two processes:

- `src/main.ts` → `AppModule`: the site API, the public API `/v1` (Scalar reference at `/v1/docs`, spec at `/v1/docs/openapi.json`), auth, mod ingest, Swagger at `/docs` (outside production), bull-board at `/admin/queues` (when `BULL_BOARD_PASSWORD` is set).
- `src/worker.ts` → `WorkerModule`: the collector, a standalone application context with no HTTP port. Its heartbeat and the Lesta circuit state show up in the API's `/health`.

## Where to read more

| Topic                                                               | Doc                                                                                           |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Module shape, segments, service names                               | [docs/guides/server/nestjs.md](../../../docs/guides/server/nestjs.md)                         |
| What every module owns                                              | [docs/guides/server/modules.md](../../../docs/guides/server/modules.md)                       |
| SQL: Prisma Client vs Kysely, numbers, db tests                     | [docs/guides/server/queries.md](../../../docs/guides/server/queries.md)                       |
| Schema, discriminator tables, retention, locks, `db:push`           | [docs/guides/server/data.md](../../../docs/guides/server/data.md)                             |
| The collector: queues, lanes, schedules, polling, deletion requests | [docs/guides/server/collector.md](../../../docs/guides/server/collector.md)                   |
| Editing rules (loaded automatically)                                | [.claude/rules/server/](../../../.claude/rules/server/)                                       |
| The refactor in progress                                            | [docs/specs/2026-10-05-server-refactor.md](../../../docs/specs/2026-10-05-server-refactor.md) |

## Layout

```text
src/
├── main.ts, app.module.ts        # the API
├── worker.ts, worker.module.ts   # the collector worker
├── config/      # env/ (secrets, addresses, ports only), app-config/, *.constants.ts (every tunable), cors/, proxy/
├── core/        # infrastructure: prisma (+ $kysely, lockedTransaction, sql-expressions), redis, logger, queues, lesta, storage, http, scrape, token-cipher
├── common/      # exceptions, filters, guards, middleware, decorators, interceptors, cache, schedules, pure helpers in lib/
├── lib/         # external clients: lesta (Lesta API), replay (.mtreplay parser), http (ky), auth (better-auth), scrape
└── modules/     # one Nest module per feature; *-worker.module.ts is the half WorkerModule loads
prisma/          # base.prisma (client + kysely generators), schema/*.prisma, sql/timescale/
scripts/         # timescale.ts, gamedata-import.ts, openapi-export.ts, deletion-request.ts, modpack-release.ts, …
generated/       # Prisma client and Kysely types (gitignored)
```

## The few rules that bite

- **Queries**: Prisma Client for CRUD, Kysely (`this.prisma.$kysely`, `tx.$kysely`) for everything else; no new `$queryRaw` / `Prisma.sql` (ESLint enforces it outside [eslint.raw-sql-allowlist.mjs](eslint.raw-sql-allowlist.mjs)). Kysely results are plain numbers; Prisma's `BigInt` columns stay `bigint`.
- **Structure**: one file per topic inside a module segment, barrels only at module boundaries; service names end in `-reader`, `-writer`, `-sync` or `-aggregate`.
- **Lesta** only through `core/lesta`; plain HTTP through `HttpClientService` / `getJson({ url, schema })`.
- **Retention** is a Lesta term: every table that grows with time gets a rule in the same change ([data.md](../../../docs/guides/server/data.md#retention)).
- **Moscow time** (`TIME.zone`) is the only calendar.
- **No Lesta mock**: without `LESTA_APPLICATION_ID` the worker runs degraded and endpoints answer empty ([collector.md](../../../docs/guides/server/collector.md#without-a-lesta-key)).

## Verification

```bash
bun run dev:server     # :4000 — curl localhost:4000/health, open /docs
bun run dev:worker     # logs "registered N of M job schedulers"
bun run test           # vitest unit suites (services mock Prisma with mockPrismaService)
bun run test:db        # query suites against a throwaway database on the dev:infra TimescaleDB
```

`src/_tests/import-cycles.test.ts` keeps the runtime import graph acyclic: a cycle through module barrels leaves a decorated class in its temporal dead zone when Nest reads the metadata ("Cannot access 'X' before initialization"), and whether it bites depends on which entry point loads the cycle first. Type-only imports are erased by Bun, so the check skips them.
