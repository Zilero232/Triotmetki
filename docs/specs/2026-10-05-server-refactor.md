# Server refactor plan

Scope: `apps/web/server` (NestJS 11 on Bun, Prisma 7 + TimescaleDB, BullMQ worker, Lesta client, replay parser). The request: a full review and refactor so the server reads easily: one way to write queries, no puzzling custom code, structure a human can follow. **Behaviour stays the same.** Anything the review found that changes behaviour is listed under [Bug and inconsistency items](#4-bug-and-inconsistency-items) and fixed separately.

Measured on 2026-10-05, at the working tree as of commit `946107870` with the uncommitted security fixes still in progress. Re-measure before each package starts.

## 1. Findings

### 1.1 Size and shape

| Metric | Value |
| --- | --- |
| Source files (`src/**/*.ts`, tests excluded) | 3,185 files, 80,138 lines (about **25 lines per file**) |
| Test files | 716 files, 62,287 lines |
| Directories under `src/` | **1,581** (about 2 files per directory), up to 9 levels deep |
| `index.ts` barrels | **1,059** (33 % of all files, 3,525 lines of re-exports) |
| `*.types.ts` files | 506 |
| Files of 5 lines or fewer (barrels excluded) | 239 |
| Nest modules / controllers / services | 119 / 79 / 345 |
| Services that inject `PrismaService` directly | 250 of 345 (there is no repository layer) |
| Largest source file | 368 lines (`streamers.controller.ts`); only 17 files exceed 200 lines |

The server has no god files. What makes it hard to read is **fragmentation and indirection**: a reader following one endpoint opens a controller, a service, a `queries/<name>/<name>.ts`, its `.types.ts`, its `index.ts`, the segment barrel, a `mappers/<name>/` folder with three more files, and a `config/` constant. Segment numbers:

| Segment | Folders | Files | Lines | Lines per file |
| --- | --- | --- | --- | --- |
| `selects/` | 20 | 99 | 523 | **5.3** |
| `mappers/` | 48 | 360 | 4,435 | 12.3 |
| `queries/` | 20 | 143 | 2,039 | 14.3 |
| `config/` | 70 | 306 | 3,648 | 11.9 |
| `dto/` | 55 | 151 | 3,524 | 23.3 |
| `lib/` (all) | 66 | 1,171 | 24,810 | 21.2 |
| `services/` | 67 | 386 | 27,436 | 71.1 |

A typical select costs a folder, two files and a barrel line for a 12-line constant (`achievements-rarity/selects/catalog-row/{catalog-row.ts,index.ts}`). That shape comes straight from the current rules (`.claude/rules/shared/structure/folders.md`: "every thing is a folder"; `service-files.md`: every select / mapper / query its own folder). Changing it is a rule change, see [Decision D1](#decisions-needed-before-phase-2).

Module size (non-test files / lines / services / test files):

| Module | Files | Lines | Services | Tests |
| --- | --- | --- | --- | --- |
| collector | 285 | 7,898 | 39 | 71 |
| streamers | 137 | 5,866 | 33 | 39 |
| gamedata | 141 | 5,375 | 0 (lib only) | 29 |
| `src/lib` (lesta, replay, http, auth, scrape) | 154 | 4,872 | 0 | 28 |
| players | 96 | 2,701 | 12 | 24 |
| notifications | 72 | 2,375 | 16 | 23 |
| replays | 85 | 2,345 | 10 | 23 |
| tanks | 83 | 2,186 | 15 | 29 |
| social | 82 | 2,184 | 10 | 18 |
| analytics / billing / mod | 67 / 68 / 84 | ~1,900 each | 9 / 10 / 5 | 20 / 21 / 20 |
| common | 123 | 1,694 | 0 | 32 |
| … 52 more modules | 7–60 | 71–1,647 | | |

Weakly tested relative to size: `discord` (10 services, 5 test files, 110 test lines), `achievements-rarity` (6 / 5 / 195), `bot-commands` (3 / 6 / 184), `vk` (2 / 3 / 93), `map-stats` (3 / 3 / 147), `best-battles` (3 / 4 / 250), `honest-rng` (3 / 5 / 248), `tank-math` (62 test lines), `community-maintenance` (no tests).

### 1.2 Raw SQL

| Pattern | Occurrences (non-test) |
| --- | --- |
| Files containing raw SQL | **96** |
| `$queryRaw<Row[]>` | 68 |
| `$executeRaw` (tagged + call) | 21 |
| `$executeRawUnsafe` | 2 (purge, retention; table names from constants, values bound) |
| `Prisma.sql` fragments | 101 |
| `Prisma.raw` | 13 (all from whitelisted lookup constants keyed by a Zod enum; no injection found) |
| `Prisma.join` / `Prisma.empty` | 9 / 12 (conditional filters, dynamic column lists) |
| CTEs (`WITH x AS`) | 24 |
| `DISTINCT ON` / `LATERAL` / window `OVER (` | 8 / 9 / 4 |
| `percentile_cont` | 19 |
| `jsonb_to_recordset` / `unnest(` bulk writes | 9 / 12 |
| `ON CONFLICT` | 11 |
| `::float8` casts | **114** (the workaround for `bigint`/`numeric` coming back from `$queryRaw` while the row types are hand-typed as `number`) |
| Services with SQL inline instead of in `queries/` | **23** |
| Hand-typed row generics | every `$queryRaw<...>`; nothing checks them against the schema |
| Raw SQL exercised against a real database in tests | **none** (`vitest.config.ts` points at a fake URL, every test mocks Prisma) |

Files with the most raw SQL: `leaderboards/queries/leaderboard-sql` (23 fragments, 147 lines), `collector/tracking/queries/account-writes` (12, 231 lines, `jsonb_to_recordset` upserts with column lists built by `Prisma.raw`), `best-battles/queries/best-battles-feed` (11), `collector/tracking/services/tracking-store.service.ts` (9, 316 lines), `best-battles-facets` (5), `analytics-overview.service.ts` (5, all inline), `search/local-search.service.ts` (4), `maps/queries/map-samples` (4), `collector/purge/services/purge.service.ts` (4), `collector/aggregates/services/account-ratings.service.ts` (4).

**Duplication inside SQL.** The per-tank stat sum block (`sum(battles)::float8 AS battles, sum(wins)::float8 AS wins, sum(damage_dealt)::float8 AS damage, …`) is written out 13 times across 9 files (`analytics-overview`, `map-advisor`, `platoon-chemistry`, `collector/aggregates/server-stats`, `modes/my-mode-stats`, `players/queries/history-series`, `players/queries/playtime`, `tanks/tank-trend`, `watchlist/watchlist-activity`). The playtime grid query exists twice (`analytics-overview.service.ts` `battlePlaytime`/`deltaPlaytime` and `players/queries/playtime`) with different weekday conventions (see B1). The stats-mode literal is sometimes `'random'::stats_mode`, sometimes `${PLAYER_STATS.snapshotMode}::stats_mode`, sometimes `STATS_MODE_SQL`.

**What raw SQL is genuinely needed** (Prisma Client cannot express it, or only with N queries):

- Timescale reads and writes: hypertable deletes per account (purge), time bucketing in Moscow time (`date_trunc(… AT TIME ZONE …)`), reads of the continuous aggregate `tank_daily_stats` that aggregate further.
- Bulk upserts with conditional `ON CONFLICT DO UPDATE` (`account-writes`, rating writes): `createMany` has no update branch, a loop of `upsert` is N round-trips inside the poll lock.
- `DISTINCT ON`, `LATERAL`, window functions, `percentile_cont`, `FILTER (WHERE …)` aggregates, ranked CTEs (leaderboards, best battles, honest RNG, marks curve, percentiles, tier pinning).
- Trigram search (`%`, `similarity`) in `local-search`.
- `FOR UPDATE SKIP LOCKED` claims (`collector/tracking/queries/claim-active`), advisory locks (`core/prisma/lib/advisory-lock`).

**Per-query classification** (all 95 queries in the 96 files read in full): **70 need SQL, 18 are borderline, 7 fit Prisma Client.** About 37 of the 95 sit inline in services; the other ~58 are in `queries/`. Hypertables are `account_snapshot`, `tank_snapshot` and `tank_battle_delta`; the continuous aggregate is `tank_daily_stats`.

- **Prisma Client fits (7):** `mod/queries/live-session` (`createMany({ skipDuplicates })`), `watchlist-activity` sessions (`playSession.groupBy`), `vehicle-catalog` premium offers (`findMany` + `Set`), `server-stats` daily (`tankDailyStats.groupBy` on the view), `purge.service` hypertable deletes (`deleteMany` per model), `analytics-overview` `tankTotals` (`tankBattleDelta.groupBy`), `tracking-store` `latestAccountBattles` (two `findFirst`; this also removes bug B0).
- **Borderline (18):** these should move to the builder rather than to Prisma Client. Six are latest-row-per-key `DISTINCT ON` reads on small tables (`latest-spec-history`, `expected-values`, `builds-catalog`, `thresholds`, …). Others are `blog-tags`, `participant-seeds`, `wrapped-busiest-month`/`top-tanks`, `tank-records`, `tank-owners`, `fetch-candidates`, `account-snapshot-window`, `pinned-tiers` ×2, `battle-review`, the `players` and `marks` leaderboards, and `replaceAccountRatingsSql`.
- **Worst five:**
  1. `collector/aggregates/services/tank-economy.service.ts` (~60 lines inline: 4 CTEs, jsonpath, two `UNION`s, 9 × `percentile_cont`).
  2. `best-battles-feed` (~110–130 lines once the 43-line `corroboratedBattleSql` fragment is expanded across 4 helpers).
  3. `account-writes` `upsertAccountModeStatsSql` (~50 lines plus generated `SET`/`CASE` lists).
  4. `learning-curve.service.ts` (~41 lines inline: `LATERAL`, `LAG`, `width_bucket`).
  5. `mode-meta.service.ts` (~41 lines inline).
- **Duplicated SQL beyond the stat sums:**
  - the replay-dedupe `NOT EXISTS` block appears in 4 queries, and the battle `UNION` replay feed shape in 7;
  - `moe-curve` and `moe-estimate` share the same 3-CTE median pipeline;
  - `history-series` duplicates analytics `trend`;
  - the same lateral latest `clan_snapshot` sits in `clan-list` and leaderboard `clansSql`;
  - `tank-events` and `record-events` share the `LAG` shape;
  - the account-mode-stats `SET` list is copy-pasted between two upserts, and the two `account-rating-writes` functions are near-identical;
  - `progression/services/shell-ledger.service.ts` hand-rolls `pg_advisory_xact_lock` instead of `lockedTransaction`.
- **Row types:**
  - about 106 `*.types.ts` files hand-declare raw row types, and none is validated at runtime;
  - half the queries alias columns to camelCase and half return snake_case;
  - `thresholds.service` types an aliased `SELECT` as the Prisma model `TankThreshold`;
  - bigint leaks are patched ad hoc: `toNumber` (~61 call sites), `Number(row.damage)`, `BigInt(row.account_id)`, a bigint→string JSON replacer in `account-writes`, and `text[]` → `::bigint` in `rollup-update`.

### 1.3 Duplication and custom code

- **Two Twitch clients.** `streamers/services/twitch-sdk.service.ts` uses `@twurple/api` + `@twurple/auth` + `@twurple/chat`, while `streamers/services/live-platforms.service.ts` (209 lines) hand-rolls Helix `/streams` and `/users` through `HttpClientService` with its own bearer token handling. Both libraries are already installed; the hand-rolled half goes.
- **`HttpClientService` is a pass-through** (`core/http`, 20 lines: `getText`, `getJson`, `requestJson`, each one ky call returning `unknown`). It earns its place only as a DI seam for tests. Every caller then parses the `unknown` itself (`parseXvmExpectedValues`, `parsePoliroidMoe`, the YooKassa client, live platforms). Deepen it: `getJson({ url, schema, options })` parses with the Zod schema and throws a typed error, so the parse moves behind the seam.
- **`common/lib` is a grab-bag** of 27 concerns, many of them domain logic owned by one module: `entitlement` (billing), `clan-info`, `emblem` (clans), `official-rating`, `career-source`, `mode-blocks` (players/collector), `session-end` (mod sessions), `bonus-type` (game data). Shared and pure ones (`ratio`, `serialize`, `moscow-time`, `week`, `json`, `hmac`, `slug`, `like-pattern`, `sort`) belong there; the rest move to their owner and are imported through its barrel.
- **Three places called "lib"/"core" with overlapping meaning**: `src/lib` (external clients: lesta, replay, http, auth, scrape), `src/core` (Nest wrappers over those plus prisma/redis/queues and two domain services: `user-lesta-accounts`, `battle-events`), `src/common/lib` (pure helpers). The split is defensible but undocumented in the code; `core/user-lesta-accounts` and `core/battle-events` are domain services and should live in a module.
- **Inconsistent units/conventions** returned by sibling endpoints: weekday 0 = Sunday in analytics vs 0 = Monday in players (both documented in `@otmetki/schemas`), see B1.
- **Service naming** has no rule: `-query`, `-store`, `-fetch`, `-read`, `-list`, `-feed`, `-aggregate`, `-sync`, `-stats` suffixes are used interchangeably (suffix counts: schedules 21, sync 13, stats 9, query 7, accounts 6, status 5, store 3, …). A name says neither whether a service reads or writes nor whether it runs in the API or the worker.
- **The server CLAUDE.md is 161 lines but 65 KB**: the module table and the collector section are single paragraphs of 500–2,000 characters. It documents everything and is read by nobody; it is part of the readability problem.

Library usage is already good in several places and is **kept**: `rate-limiter-flexible` for the Lesta token bucket, `cockatiel` for the breaker, `p-retry`, `p-limit`, remeda/ts-pattern/date-fns (commit `fc5d83f24`), `@donation-alerts/*`, `vk-io`, `grammy`, `@discordjs/*`, `standardwebhooks`, `ics`, `feed`, `rss-parser`. The replay parser (`src/lib/replay`, 1,560 lines) and the Lesta client (`src/lib/lesta`, 2,064 lines) have no maintained npm equivalent for this game's format and realm; keep them, readability pass only.

### 1.4 Tests

- 716 test files; every service test builds its collaborators with `vitest-mock-extended` (`mockDeep<PrismaService>()`), there are no `vi.mock` module mocks (commit `71db217f6` removed them) and no database.
- Consequence: **raw SQL is untested**. A test of a service that calls `$queryRaw` asserts on the mocked return value, so a wrong column, a wrong join or a `bigint` that should have been cast passes. The same holds for `jsonb_to_recordset` upserts in the poll pipeline, the most critical write path.
- Many Prisma Client tests assert on the call shape (`expect(prisma.x.findMany).toHaveBeenCalledWith({ where: … })`), which tests the implementation and breaks on any refactor that keeps behaviour.
- Server config: `pool: 'threads'`, `isolate: false`, 15 s timeouts "for the first test of a file that pulls a large module graph": the barrel graph (1,059 barrels) makes every test import far more than it uses.

## 2. Target conventions

These become rules in `.claude/rules/server/` and `apps/web/server/CLAUDE.md` in WP-0.

### R1. One way to write SQL: Kysely through Prisma

Prisma Client stays the default for CRUD and anything it expresses directly. **Everything else is Kysely**, typed from the Prisma schema, running on Prisma's own connection and transactions. No new `$queryRaw`, `$executeRaw`, `Prisma.sql`, `Prisma.raw` or `Prisma.join`.

Stack (all maintained, Prisma 7 compatible):

- [`kysely`](https://kysely.dev) — the query builder.
- [`prisma-kysely`](https://github.com/valtyr/prisma-kysely) ≥ 3.0 (3.0 added Prisma 7 support; Bun or Node ≥ 22) — a Prisma generator that writes the Kysely `DB` type from `prisma/schema/*.prisma` on every `prisma generate`, so the types can never drift from the schema. Hypertables are Prisma models already; the `TankDailyStats` view is generated too.
- [`prisma-extension-kysely`](https://github.com/eoin-obrien/prisma-extension-kysely) v4 (requires Prisma 7 and a driver adapter, which `@prisma/adapter-pg` already is) — exposes `prisma.$kysely` and `tx.$kysely`; inside `$transaction` and `lockedTransaction` a Kysely query uses the transaction's connection.

Why not the alternatives:

- **Prisma TypedSQL** (`prisma/sql/*.sql` → generated functions): still a preview feature in Prisma 7, supported only by the new `prisma-client` generator (this repo uses `prisma-client-js`), needs a **live database at `prisma generate`** (breaks `postinstall` and the Docker image build, which have no database), and has no dynamic SQL: no optional filters, no dynamic `ORDER BY` or column choice, arrays only through `= ANY`. The leaderboards, best battles, clan list and the bulk upserts all need composition, so they would stay on `$queryRaw` and we would have two ways instead of one.
- **Drizzle**: a second ORM with its own schema definition; the Prisma schema would have to be mirrored or introspected, and Drizzle does not join Prisma's transactions. Too much surface for the problem.
- **Keep `Prisma.sql`** with a lint rule and Zod-parsed rows: no types from the schema, no autocomplete for columns, composition stays string glue (`Prisma.raw` over interpolated column names), and the 114 `::float8` casts stay.

Setup (WP-1):

```prisma
// prisma/base.prisma
generator kysely {
  provider     = "prisma-kysely"
  output       = "../generated/kysely"
  fileName     = "database.ts"
  enumFileName = "enums.ts"
}
```

```ts
// core/prisma/prisma.factory.ts
export const createPrismaClient = ({ url, pool, log = ['error'] }: CreatePrismaClientInput) =>
  new PrismaClient({ adapter: new PrismaPg(createPgPool({ url, pool })), log }).$extends(
    kyselyExtension({
      kysely: (driver) =>
        new Kysely<DB>({
          dialect: { createAdapter: () => new PostgresAdapter(), createDriver: () => driver, createIntrospector: (db) => new PostgresIntrospector(db), createQueryCompiler: () => new PostgresQueryCompiler() },
          plugins: [new CamelCasePlugin()]
        })
    })
  );
```

`PrismaService` and `PrismaExecutor` get the extended type, so `this.prisma.$kysely` and `tx.$kysely` are available everywhere. `pg` numeric type parsers (`int8`, `numeric` → `number` where safe, set once on the pool) replace the `::float8` casts; account ids stay `bigint`.

Rules:

1. A query function lives in `queries/<module>-<topic>.queries.ts`, takes `(db, input)` where `db` is `Kysely<DB>` (or the executor) and returns typed rows. No SQL in services, ever.
2. Use the builder (`selectFrom`, `where`, `groupBy`, `$if`, `with`, `distinctOn`, `innerJoinLateral`, `onConflict`). Drop to the `sql` tag only for an expression the builder lacks (`percentile_cont`, `date_trunc … AT TIME ZONE`, `similarity`), and put each such expression in `core/prisma/sql-expressions.ts` once (`moscowBucket`, `percentile`, `statSums`), never inline twice.
3. Dynamic columns come from `sql.ref()` over a typed key union, never string interpolation.
4. Bulk writes use `insertInto(...).values(rows).onConflict(...)` (Kysely binds the rows; no `jsonb_to_recordset` JSON round-trip).
5. Timescale DDL stays in `prisma/sql/timescale/*.sql` applied by `scripts/timescale.ts`; that is schema, not queries.
6. Every query function has an integration test against a real TimescaleDB (R5).

Before (`leaderboards/queries/leaderboard-sql`):

```ts
export const playersSql = ({ query, minBattles, filter = Prisma.empty }: PlayersSqlInput): LeaderboardSql => {
  const column = Prisma.raw(`ar.${ACCOUNT_RATING_COLUMN[query.metric]}`);
  const from = Prisma.sql`FROM account_rating ar JOIN player p ON p.account_id = ar.account_id AND NOT p.is_hidden`;
  const where = Prisma.sql`WHERE ar.period = ${RATING_PERIOD_SQL[query.period]}::rating_period AND ar.battles >= ${minBattles} AND ${column} IS NOT NULL ${filter}`;

  return {
    page: Prisma.sql`SELECT ar.account_id AS "accountId", … ${column}::float8 AS value … ${from} … ${where} ORDER BY ${column} DESC LIMIT … OFFSET …`,
    total: Prisma.sql`SELECT count(*) AS total ${from} ${where}`
  };
};
```

After:

```ts
const rankedPlayers = ({ db, query, minBattles, streamersOnly }: RankedPlayersInput) => {
  const value = sql.ref<number>(`account_rating.${ACCOUNT_RATING_COLUMN[query.metric]}`);

  return db
    .selectFrom('account_rating')
    .innerJoin('player', 'player.account_id', 'account_rating.account_id')
    .where('player.is_hidden', '=', false)
    .where('account_rating.period', '=', RATING_PERIOD_TO_DB[query.period])
    .where('account_rating.battles', '>=', minBattles)
    .where(value, 'is not', null)
    .$if(streamersOnly, (q) => q.where('account_rating.account_id', 'in', (s) => s.selectFrom('streamer_profile').select('account_id')))
    .select({ value });
};

export const playersPage = (input: RankedPlayersInput) =>
  rankedPlayers(input)
    .leftJoin('clan', 'clan.clan_id', 'player.clan_id')
    .select(['player.account_id as accountId', 'player.nickname as name', 'clan.tag as clanTag', 'account_rating.battles'])
    .orderBy('value', 'desc')
    .limit(input.query.limit)
    .offset(input.query.offset)
    .execute();

export const playersTotal = (input: RankedPlayersInput) =>
  rankedPlayers(input).select((eb) => eb.fn.countAll<number>().as('total')).executeTakeFirstOrThrow();
```

(Snippet shows the shape; the exact column list is preserved during migration.)

### R2. Module and service shape

- Controller: validate, delegate, return (unchanged rule).
- **Service names say what they do**: `<topic>-reader.service.ts` for API reads, `<topic>-writer.service.ts` for writes with business rules, `<topic>-sync.service.ts` for worker jobs that pull an external source, `<topic>-aggregate.service.ts` for worker jobs that recompute a table. No `-query`, `-store`, `-fetch`, `-list` suffixes. A service with one method that forwards to one query is deleted and the caller calls the query function (the deletion test).
- A service owns at most one domain of work and stays ≤ ~200 lines; a service with more than ~8 public methods or more than ~5 injected collaborators is split.
- Domain services move out of `core/` (`user-lesta-accounts`, `battle-events`) into a module; `core/` holds infrastructure only.

### R3. Fewer files: one file per segment per module until it grows

Proposed change to `folders.md` / `service-files.md` (needs Decision D1):

- `selects/`, `mappers/`, `queries/` become **one file per topic** (`players.selects.ts`, `player-history.mappers.ts`, `player-history.queries.ts`), not one folder per constant. A topic becomes a folder only when it gets a companion (`.types.ts` with more than a couple of types, its own `_tests/`).
- Barrels only at module boundaries (`modules/<x>/index.ts`) and at `common/lib/index.ts`; no barrel per segment inside a module and none per item. Inside a module, relative imports point at the file.
- `lib/<concern>/` folders stay (pure logic with tests next to it is the part of the current shape that works).

Expected effect: about −700 barrels, −250 tiny files, −600 directories, with no behaviour change.

### R4. Where helpers live

| Kind | Place |
| --- | --- |
| Rating math (WN8, EFF, win rate, ratios over battles) | `@otmetki/ratings`, never re-derived in the server |
| Pure helpers used by ≥ 2 modules, no domain knowledge | `common/lib/<concern>` |
| Domain logic used by one module | that module's `lib/<concern>` |
| Domain logic used by several modules | the owning module's `lib/`, exported through its barrel |
| SQL expressions reused by queries | `core/prisma/sql-expressions.ts` |
| External API clients | an npm SDK when one exists (`@twurple/api`); otherwise `src/lib/<client>` + a Nest wrapper in `core/` |
| Win rates | percent (0–100) in every API response, as `percentOf` returns today |

### R5. Tests

- **Query tests hit a real database.** A new vitest project `server-db` (`src/**/_tests/**/*.db.test.ts`) runs against the `dev:infra` TimescaleDB in a throwaway schema (or `@testcontainers/postgresql` with `timescale/timescaledb-ha` where Docker is available), applies `db push` + `db:timescale` once, seeds per test with Prisma, calls the query function, asserts on rows. Deploy's `checks` job starts the same service container.
- Service tests mock the query functions (one `queries` object injected or passed), not `prisma.$queryRaw`. Assert on returned values, not on Prisma call shapes.
- Pure `lib/` tests stay as they are.

## 3. Work packages

Rules for every package: refactor only, behaviour identical; one package = one agent = one set of files listed below; a package never edits a file owned by another package in the same phase. If a package needs a change in a shared file, it records it for the phase owner instead of editing.

**Verification gate (every package):** `bun run verify` · `bunx vitest run --project server` (and `--project server-db` once WP-1 lands) · `bun run test:changed` · for packages that touch public endpoints, `bun run test:e2e` · `bun run dev:all` boots, `curl localhost:4000/health` is green and the worker logs "registered N of M job schedulers" with the same N as before. The OpenAPI document (`bun run openapi:export`) must be byte-identical before and after unless the package says otherwise; diff it.

### Phase 0 — rules (sequential, one agent)

**WP-0 Conventions.** Files: `.claude/rules/server/**`, `.claude/rules/shared/structure/folders.md` (server part), `apps/web/server/CLAUDE.md`, `docs/guides/server/nestjs.md`. Goal: write R1–R5 as rules (after D1–D3 are decided), add an ESLint `no-restricted-syntax` / `no-restricted-properties` ban on `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.sql`, `Prisma.raw` outside a temporary allowlist of the 96 current files (the allowlist shrinks per package and is deleted in WP-14). Rewrite the server CLAUDE.md module table into one short line per module. Done: rules merged, lint passes with the allowlist. Risk: low.

### Phase 1 — foundations (parallel; no module files touched)

**WP-1 Query layer.** Files: `package.json` (server; catalog if shared), `prisma/base.prisma`, `core/prisma/**`, `vitest.config.ts` (server) + new `vitest.db.config.ts`, `.github/workflows/deploy.yml` (service container for `server-db`), `docker-compose` dev infra if needed. Goal: install `kysely`, `prisma-kysely`, `prisma-extension-kysely`; extend the client; `PrismaExecutor` typed with `$kysely`; `pg` type parsers; `core/prisma/sql-expressions.ts` (`moscowBucket`, `moscowWeekday`, `statSums`, `percentile`); the `server-db` test project with a seeding helper; port `advisory-lock` to Kysely as the pilot with a db test. Done: `prisma generate` emits `generated/kysely`; `bun run dev:all` boots under Bun; pilot test green in CI; the Docker image build still works without a database. Risk: medium — confirm `prisma-extension-kysely` under Bun with `@prisma/adapter-pg` and inside `lockedTransaction` first; if it fails, fall back to a plain `Kysely` instance on the same `pg.Pool` and pass `tx`-bound connections explicitly (still one way to write SQL).

**WP-2 Shared helpers.** Files: `common/lib/**`, `packages/ratings` (additions only). Goal: add the shared helpers the module packages will need (ratio/percent with one unit, Moscow time); copy (not move) domain helpers that must leave `common/lib` into their owner later — in this phase only mark them `@deprecated`-free by listing them in the package handover (no comments in code). Done: helpers exported, unit-tested; nothing removed yet. Risk: low.

**WP-3 HTTP seam.** Files: `core/http/**`, `src/lib/http/**`. Goal: `getJson({ url, schema, options })` / `getText` with schema parsing and a typed `HttpParseError`; old methods kept until callers move. Done: tests for parse success/failure. Risk: low.

### Decisions needed before phase 2

- **D1** Adopt R3 (one file per topic, barrels only at module boundaries)? It reverses an explicit current rule. If declined, phase-2 packages still migrate SQL but keep the folder shape.
- **D2** Service suffix vocabulary of R2 (`-reader`, `-writer`, `-sync`, `-aggregate`): accept or replace.
- **D3** Real-database tests in the deploy gate (adds a TimescaleDB service container to `checks`).

### Phase 2 — module migrations (parallel; each owns its modules exclusively)

Each package, for every module it owns: move inline SQL out of services; rewrite each raw query in Kysely (or Prisma Client where it is enough, per §1.2), with a `*.db.test.ts` that pins today's results first (write the test against the old query, keep it green across the rewrite); replace the duplicated stat-sum and playtime SQL with `sql-expressions`; move to the new helper locations (R4) and the HTTP seam (WP-3); apply R2 naming and, if D1 is accepted, R3 file shape; switch service tests to mocking query functions; remove the module's files from the raw-SQL lint allowlist.

| WP | Owns | Raw-SQL files | Notes / risk |
| --- | --- | --- | --- |
| **WP-4 Poll write path** | `collector/tracking/**` | `account-writes`, `tracking-store.service`, `claim-active`, `dispatch.service` | Highest risk: the poll transaction, `jsonb_to_recordset` upserts, `SKIP LOCKED`. Pin with db tests over a two-poll scenario (snapshots, deltas, `player_tank`, marks, day session) before touching it. Run the worker against a real account in dev before/after and diff the rows. |
| **WP-5 Collector aggregates** | `collector/aggregates/**`, `collector/reference/**`, `collector/clans/**`, `collector/metrics/**` | `account-ratings`, `account-rating-writes`, `pinned-tiers`, `server-players`, `server-stats`, `tier-maintenance`, `tank-percentiles`, `tank-economy`, `mode-meta`, `learning-curve`, `build-usage`, `tank-boundary`, `build-ranks`, `account-snapshot-window`, `vehicle-sync`, `moe-estimate(-sync)`, `latest-spec-history`, `clan-activity`, `clan-sync`, `metrics.service` | Also splits `aggregates` by table owner if it stays a grab-bag. Medium. Uses WP-3 for `expected-values-sync`, `moe-thresholds-sync`, `news-sync`. |
| **WP-6 Purge and retention** | `collector/purge/**`, `auth` account purge | `purge.service`, `retention.service`, `scrub-replay-player` | Lesta-term critical; db tests over a deletion request end to end (hypertables, relational rows, superseded request). Low code volume, high stakes. Wait until the security-fix agent's purge changes are committed. |
| **WP-7 Player stats reads** | `players`, `analytics`, `modes`, `watchlist`, `tanks` | `history-series`, `playtime`, `combined-damage`, `activity-days`, `player-playtime`, `player-history`, `player-marks`, `analytics-overview`, `map-advisor`, `platoon-chemistry`, `battle-review`, `my-mode-stats`, `watchlist-activity`, `tank-trend` | Owns the 13 duplicated stat-sum blocks and both playtime queries (one shared query, keeping both weekday conventions until B1 is decided). Medium. |
| **WP-8 Rankings and feeds** | `leaderboards`, `best-battles`, `clans`, `search`, `maps`, `map-stats`, `honest-rng`, `marks`, `achievements-rarity` | `leaderboard-sql`, `leaderboard.service`, `best-battles-feed/facets` (+ services), `clan-list`, `local-search`, `map-samples`, `maps.service`, `tank-map-stats`, `bonus-modes`, `rotation-counts`, `queue-times`, `map-stats-aggregate`, `rng-battles`, `rng-aggregate`, `moe-curve` (+ service), `tank-owners`, `rollup-update`, `fetch-candidates`, `rarity-aggregate`, `achievements-fetch` | Dynamic sorting and filters: the main beneficiaries of the builder. Medium. |
| **WP-9 Mod and notifications** | `mod`, `notifications`, `session-share` | `battle-corroboration`, `tank-records`, `live-session`, `mod-ratings`, `mod-ingest`, `marks-watch`, `previous-battle-marks` | Ingest signature path untouched; only queries. Medium. |
| **WP-10 Community and the rest** | `social`, `competitions`, `tournaments`, `progression`, `pulse`, `blog`, `builds`, `reference` | `wrapped` (+ 3 queries), `snapshot-events`, `weekly-challenge`, `tank-events`, `record-events`, `challenge-battles`, `competition-scoring`, `competition-battles`, `tournament.service`, `participant-seeds`, `shell-ledger`, `pulse`, `blog-query`, `blog-tags`, `builds-catalog`, `vehicle-catalog`, `thresholds`, `expected-values` | Low–medium; `reference` services are read by many modules, so keep their public interface stable. |
| **WP-11 Billing** | `billing` | none | Only service shape, naming, tests, HTTP seam for the YooKassa client. Start after the security-fix agent's billing changes are committed. Low. |

### Phase 3 — structure (parallel; after phase 2 for the same modules)

**WP-12 Streamers split.** Files: `modules/streamers/**` (137 files, 33 services, `streamers.controller.ts` 368 lines, `streamers.types.ts` 321 lines). Goal: split into Nest modules by concern — profiles/directory/claims, overlays (data, SSE, preview), integrations (Twitch, DonationAlerts, VK, YouTube), challenges and auto-predictions — with one controller per concern; replace the hand-rolled Helix calls in `live-platforms.service.ts` with the existing `@twurple/api` client from `twitch-sdk.service.ts`; YouTube/VK through the WP-3 seam. Done: no file in streamers > 200 lines, no hand-written Helix URL, routes and OpenAPI unchanged. Risk: medium (overlay SSE and chat lifecycles).

**WP-13 Collector and core layout.** Files: `modules/collector/{board,monitoring,producer,queues,schedules,contracts}/**`, `core/user-lesta-accounts`, `core/battle-events`, `common/lib` domain helpers (the moves prepared in WP-2) and their importers. Goal: move domain services out of `core/`, domain helpers out of `common/lib`, delete the then-unused copies. This is the one package that edits import lines across modules, so it runs alone, after phase 2. Done: `common/lib` holds only domain-free helpers; `core/` only infrastructure; import-cycle test green. Risk: low–medium (import cycles; `src/_tests/import-cycles.test.ts` guards it).

### Phase 4 — finish (sequential)

**WP-14 Cleanup.** Delete the raw-SQL lint allowlist (must be empty), remove the old `HttpClientService` methods, run `bun run lint:unused` and `bun run lint:dupes` and fix what the refactor left, re-measure §1 and append the numbers to this doc. Done: zero `$queryRaw`/`Prisma.sql` outside `core/prisma/lib/advisory-lock` if it stays raw; numbers recorded.

Parallelism: phase 1 runs WP-1/2/3 at once; phase 2 runs WP-4 … WP-11 at once (8 agents, disjoint modules); phase 3 runs WP-12 alongside WP-13 only if WP-13 does not touch streamers imports (otherwise sequential).

## 4. Bug and inconsistency items

Found during the review; **not** part of the refactor. Each needs an owner decision and its own change.

- **B0 (likely runtime error, fix first, separately from the refactor).** `collector/tracking/services/tracking-store.service.ts:200` (`latestAccountBattles`) casts `'all'::"StatsMode"`. The Postgres enum is `@@map("stats_mode")` (`prisma/schema/snapshots.prisma:15`); no type `"StatsMode"` exists, so the statement should fail with "type does not exist" whenever it runs. Tests mock it (`poll-pipeline.fixtures.ts`). Verify against the dev database, then fix (`::stats_mode`, or two `findFirst` calls) with a db test.
- **B4 Performance, not behaviour:** the four `best-battles-facets` queries each rebuild the same corroborated CTE (4 scans per request), and `clan-list` uses `(${x}::t IS NULL OR …)` catch-all filters that defeat index use. Fix during WP-8 only if result-identical; otherwise file separately.
- **B1 Weekday convention differs between sibling endpoints.** `analytics-overview.service.ts` (`battlePlaytime`, `deltaPlaytime`) uses `extract(dow …)` → 0 = Sunday; `players/queries/playtime` uses `extract(isodow …) - 1` → 0 = Monday. Both are documented that way in `@otmetki/schemas` (`analytics.schemas.ts:72`, `players.schemas.ts:236`), and `analytics/lib/playtime-split` imports `PlaytimeRow` from players, so one row type carries two meanings. Proposal: Monday-first everywhere (Moscow), contract change in both schemas and the client.
- **B2 Playtime scope differs.** Analytics counts only random battles (`battle_type = ANALYTICS_SQL.randomBattleType`) from mod battles; the player page's playtime counts every battle type from the same table. Decide whether the player page should be random-only too.
- **B3 Stats-mode literal not from one constant.** `'random'::stats_mode` is hard-coded in `analytics-overview.service.ts` (4 times in 2 files) while other queries use `PLAYER_STATS.snapshotMode` / `STATS_MODE_SQL`. Same value today; fold into the constant during WP-7 (no behaviour change).

## Sources

- [Prisma TypedSQL docs](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/typedsql) — preview, `prisma-client` generator only, database required at generate, no dynamic SQL.
- [prisma-extension-kysely](https://github.com/eoin-obrien/prisma-extension-kysely) — v4 requires Prisma 7 and a driver adapter; interactive transactions through `tx.$kysely`.
- [prisma-kysely releases](https://github.com/valtyr/prisma-kysely/releases) / [npm](https://www.npmjs.com/package/prisma-kysely) — 3.x supports Prisma 7 (Bun or Node ≥ 22).
- [Kysely: generating types](https://kysely.dev/docs/generating-types).
