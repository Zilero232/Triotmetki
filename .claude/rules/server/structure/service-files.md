---
paths:
  - "apps/web/server/**/*.ts"
---

<!-- Compressed editing rules for the server app (API and worker), loaded automatically on edit. -->
<!-- Server specifics in apps/web/server/CLAUDE.md; module shape in docs/guides/server/nestjs.md. Keep them in sync. -->

# Code style — server: what goes beside a service

## Nothing but the class in a service or controller file

| What                               | Where                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Constants, timeouts, lookup tables | `config/<concern>.constants.ts`; a lib's own tunables in `lib/<name>/<name>.constants.ts` |
| Pure domain logic                  | `lib/<concern>/` — one folder per **concern**, tested there                               |
| Row / payload → DTO converters     | `mappers/<topic>.mappers.ts` — every `to*View` / `to*Dto` of one topic                    |
| Prisma `select` / `include`        | `selects/<topic>.selects.ts` with their `GetPayload` types                                |
| SQL beyond Prisma Client           | `queries/<topic>.queries.ts` — Kysely query functions (`data/queries.md`)                 |
| Guards, decorators, interceptors   | `guards/`, `decorators/`, `interceptors/`, one file per item                              |
| Custom providers, queue handles    | `providers/<name>.provider.ts`                                                            |
| Types                              | `<file>.types.ts` next to the file that owns them                                         |

## One file per topic, barrels only at module boundaries

The server does **not** follow the shared "every thing is a folder" rule. Inside a
module, a segment (`selects/`, `mappers/`, `queries/`, `dto/`, `config/`) holds **one
file per topic** — `player-history.queries.ts`, `players.selects.ts` — not one folder per
constant or function. Its types sit beside it as `<topic>.types.ts`, its tests in the
segment's `_tests/` (`queries/_tests/player-history.queries.db.test.ts`). A topic becomes
a folder only when it outgrows one file. `lib/<concern>/` keeps its folder (logic plus
`_tests/`), and a file that mixes a mapper with domain logic is still split.

`index.ts` barrels exist only at boundaries other code imports through: a module root
(`modules/<x>/index.ts`), a collector or streamers sub-module, `core/<x>/`, `src/lib/<client>/`,
`config/index.ts`, `common/<x>/index.ts` (`lib`, `exceptions`, `decorators`, `guards`, …) and
`openapi/index.ts`. No barrel per segment and none per item; inside a module,
relative imports point at the file. Import from a module's barrel across boundaries,
never reach into its files.

Nest resolves providers from decorator metadata, so **no `import type` for
injected classes** — the `otmetki/server` ESLint block turns
`ts/consistent-type-imports` off for the server app.
