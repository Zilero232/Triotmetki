# Server routes — NestJS

Part of the [style guide](../README.md).

## 18. Server routes — NestJS

The server app is NestJS 11 on Bun, not a route-definition framework. What matters from
the client's side:

```text
src/modules/search/
  search.module.ts
  search.controller.ts    ← thin: validate, delegate, return
  search.types.ts
  services/               ← one service per domain of work: <topic>-reader / -writer / -sync / -aggregate.service.ts
  dto/                    ← createZodDto(...) wrappers; server-only schemas in <module>.schemas.ts
  mappers/                ← <topic>.mappers.ts: DB row / Prisma payload / Lesta payload → DTO (every to*View)
  selects/                ← <topic>.selects.ts: Prisma select / include constants and their payload types
  queries/                ← <topic>.queries.ts: Kysely query functions ({ db, ...input }) — queries.md
  lib/<concern>/          ← pure domain logic only, a folder per concern with its _tests/
  guards/ decorators/ interceptors/  ← Nest enhancers, one file per item
  processors/             ← BullMQ processors and their *-schedules.service.ts
  providers/              ← custom providers and queue registrations (<name>.provider.ts)
  templates/ assets/      ← message templates, static files read at runtime
  config/                 ← <concern>.constants.ts: constants, timeouts, lookup tables, queue names
  index.ts                ← the module's public API, the only barrel in the module
```

Inside a module a segment holds one file per topic, not a folder per item, and has no
barrel; relative imports point at the file (`lib/<concern>/` folders have no `index.ts`
either).

- DTOs wrap a schema: `export class SearchQueryDto extends createZodDto(searchQuerySchema) {}`
  (`nestjs-zod`). A contract the client reads or sends lives in `@otmetki/schemas`, so
  client and server validate against one definition; a request schema only the server
  validates may live in the module's `dto/<module>.schemas.ts`, and the client gets its
  type from the OpenAPI codegen.
- Every processor extends `TrackedWorkerHost` and implements only the protected `handle`; its `process` wraps `handle` in `MetricsService.track`
  (`MetricsService` from `modules/collector/metrics`).
- The collector (`modules/collector`) is a module of sub-modules — `tracking`, `clans`,
  `reference`, `aggregates`, `news`, `purge`, `metrics`, `producer`, `queues`,
  `schedules`, `board`, `monitoring` — each shaped like a module; its `contracts/` holds
  the shared queue contract (`QUEUE`, `JOB`, payload schemas).
- Domain errors are thrown as the app exceptions from `common/exceptions` with a
  code from `@otmetki/schemas` — `` throw new AppNotFoundException('CLAN_NOT_FOUND', `No clan with id ${clanId}`) ``.
  The client matches on the code, so the message is free text but the code is a
  contract.
- Import from a module's barrel across module boundaries, never into its files.
- SQL beyond Prisma Client is Kysely ([queries.md](queries.md)); the schema, retention and
  locks are in [data.md](data.md), the worker in [collector.md](collector.md), and what each
  module owns in [modules.md](modules.md).
