---
paths:
  - "apps/web/server/**/_tests/**/*.ts"
  - "apps/web/server/vitest.config.*"
  - "apps/web/server/vitest.db.*"
  - "apps/web/server/vitest.setup.ts"
---

<!-- Auto-loaded when editing tests or their configs. Full picture — the root CLAUDE.md. -->

# Tests — server environment

## Environment

- **server** (API and worker) — node, with a dummy env in the config, legacy decorators with metadata enabled for Nest and `reflect-metadata` loaded by `vitest.setup.ts`. Without the env any import that pulls the Prisma chain fails Zod env validation; adding a required variable means adding it there too. Pure logic stays in `lib/` and tests without Nest; services and processors are tested with `vitest-mock-extended` (`mockPrismaService()` from `core/prisma/_tests/prisma-mock` — a `mockDeep<PrismaService>()` whose `$kysely` is a real Kysely over a dummy driver, so `lockedTransaction` runs and `advisoryLocks(queries)` shows the locks it took — and `mock<Queue>()`) — never an `as` cast to fake a collaborator. No `vi.mock` of an app module or package a service imports: the server runs with `isolate: false`, so the mock leaks into every file sharing the worker. Wrap the call in an injectable service (`PageCrawlerService`, `TwitchSdkService`, `HostLookupService`, `WebPushSenderService`, `HttpClientService` for plain `ky` calls) or an injectable client and pass `mock<T>()` through the constructor. The same holds for globals and constants: no `vi.stubGlobal('fetch')`, no `vi.spyOn(SomeSdk.prototype, ...)`, no `Reflect.set` on an `as const` config — a flag a test must flip is injected (`SubscriptionWriterService.isCheckoutEnabled`, a `NOTIFICATION_TOKENS` value).

- **server `lib/lesta`** — `ioredis-mock` stands in for the shared rate-limit bucket. Every `RedisMock` instance shares one in-memory store across files (`isolate: false`), so the server's `vitest.setup.ts` flushes it before every test; a test that needs Redis state sets it up inside the test, not in `beforeAll`.

- **server-db** (`apps/web/server/vitest.db.config.ts`, `bun run test:db`) — query tests against a real TimescaleDB, files named `*.db.test.ts` (the unit project excludes them). The global setup creates a throwaway database `otmetki_test_<time>_<pid>` on the server of `TEST_DATABASE_URL` (else the root `.env` `DIRECT_URL`, the `dev:infra` container on :5434), applies `timescale.ts --extensions`, `prisma db push` and the Timescale layer, and drops it afterwards — the dev database's own state never matters. Without a reachable server the suites skip with a warning; `SERVER_DB_REQUIRED=true` (the deploy `checks` job, which starts a `timescale/timescaledb-ha:pg17` service) makes that a failure. A suite wraps itself in `describeWithDatabase`, builds its client with `createTestPrisma()`, empties the tables it touches with `truncateTables` in `beforeEach`, seeds with Prisma Client and asserts on the rows the query function returns (`core/prisma/_tests/test-database.ts`). Files run one at a time on a shared database.
