# Server refactor plan

Scope: `apps/web/server` (NestJS 11 on Bun, Prisma 7 + TimescaleDB, BullMQ worker, Lesta client, replay parser). The request: a full review and refactor so the server reads easily: one way to write queries, no puzzling custom code, structure a human can follow. **Behaviour stays the same.** Anything the review found that changes behaviour is listed under [Bug and inconsistency items](#4-bug-and-inconsistency-items) and fixed separately.

Measured on 2026-10-05, at the working tree as of commit `946107870` with the uncommitted security fixes still in progress. Re-measure before each package starts.

**Status (2026-10-05).** Decisions D1, D2 and D3 are accepted. All packages, WP-0 through WP-14, have landed; what changed against the plan is recorded under each package as *Landed*, and the final numbers are under WP-14. §1.5 adds the findings of the follow-up audits and assigns them to packages.

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
- Follow-up audit: **no test touches a real database.** 247 test files build `mockDeep<PrismaService>()`; only 10 of the 143 files in `queries/` have a test at all, and those assert on the SQL string a builder produces (`expect(sql.sql).toContain(...)`), never on rows. A wrong join, a lost `bigint` or a broken `ON CONFLICT` passes every suite. WP-1 adds the `server-db` project; every phase-2 package pins its queries there before rewriting them (R5).

### 1.5 Follow-up audits

Findings of the second and third review passes, each assigned to the package that owns the code. Counts are from 2026-10-05.

| Finding | Where | Package |
| --- | --- | --- |
| Tests never touch a real database (above) | 247 `mockDeep<PrismaService>` suites; 10 of 143 query files tested, SQL-string assertions only | WP-1 (infrastructure), every phase-2 package (db tests per query) |
| `streamers` lists 8 providers in both its API and its worker module (`ChallengeService`, `DonationAlertsSdkService`, `FeedReaderService`, `IntegrationStoreService`, `LivePlatformsService`, `OverlayPublisherService`, `SettingsAggregateService`, `TwitchSdkService`) instead of importing them from one shared module, and is one module doing eight jobs | `streamers.module.ts`, `streamers-worker.module.ts` | WP-12: split into 8 Nest modules (profiles/directory, claims, settings, overlays data, overlays SSE/preview, integrations, challenges, auto-predictions), each provider registered once and exported |
| `collector/aggregates` mixes jobs for unrelated consumers | `collector/aggregates/**` | WP-5: split by consumer — ratings (leaderboards, players), server stats and percentiles (tanks), economy and mode meta (tanks, modes), build usage (builds), MoE estimate (marks) |
| 15 hand-written win-rate computations with mixed units, among them `0..1` (`session-card` clamps to 0..1, `session-reports`, `wrapped`, `bot-replies` session, `mode-rank`) and `0..100` (`time-series`, `tank-learning-view`, `streamer-stats`, `notification-copy`, `watchlist-digest` rounded to one decimal, `my-mode-stats` via `percentOf`, `tank-percentiles` in SQL), and a zero-battles case that is sometimes `null`, sometimes `0` | modules listed | WP-2 added `winRatePercent` / `winRateShare` (both `null` without battles); WP-5, WP-7, WP-9, WP-10, WP-12 migrate their sites keeping each site's unit and zero case (clamp at the call site where it clamps today) |
| Three divide helpers with different zero semantics: `safeDivide` (`@otmetki/ratings`, `0` on a zero denominator), `ratio` / `percentOf` (`common/lib/ratio`, `null` on `by <= 0`, `percentOf` clamps to 0..100), the private `optionalDivide` in `ratings/stats` (`null` on `0` or `undefined`) | `packages/ratings/src/stats`, `common/lib/ratio` | Rule: the server uses `ratio` / `percentOf` / `winRate*` (`null` means "no value"); `safeDivide` stays inside the ratings math. Module packages replace hand-written divisions |
| 8 primary-account lookups bypass `UserLestaAccountsService.primaryAccountId` / `accountIds` and query `userLestaAccount` themselves, with `USER_LESTA_ACCOUNT_ORDER` or an order of their own (`mod/services/mod-bind`, `missions/services/mission-tanks`, `notifications/services/first-win-reminders`, `me/services/linked-accounts` among them; re-grep `userLestaAccount.find` outside `core/user-lesta-accounts` for the rest) | auth, me, missions, mod, notifications, social and others | WP-13 moves the service out of `core/` into a module; the owning phase-2 package replaces its lookup with the service call |
| 15 hand-rolled offset paginations (`Promise.all([findMany({ take: limit, skip: offset }), count()])` → `{ items, total, limit, offset }`) | achievements-rarity collectors, analytics battle review, blog, clans page, coaching, community-builds, competitions, guides, platoons, players sessions, recruiting, replays (×2), shop news and offers, tournaments | WP-2 added `paginate({ limit, offset, fetch, count })`; the module packages migrate (WP-7, WP-8, WP-10, WP-11 and WP-13 for the modules outside the phase-2 table) |
| Live platforms hand-roll Helix `/streams` and `/users` with their own bearer token although `@twurple/api` is installed and used next door | `streamers/services/live-platforms.service.ts` | WP-12 (already listed) |
| Local rounding helpers (`round`, `Math.round(x * 10) / 10` inline) | clans `avg-battles-per-day`, competitions `competition-scoring`, replays `replay-tracks`, shop `offer-return`, tanks `tier-list`, telegram playlist commands, watchlist `watchlist-digest` | WP-2 added `roundTo({ value, digits })`; WP-7, WP-8, WP-10 and WP-13 migrate. Steps that are not decimal rounding (`progression` `roundUp` to a step, `tank-economy` `roundOrNull`) stay |
| MoE mark percents hard-coded although `MOE.markPercents` (`@otmetki/ratings`) exists | players `lib/next-mark` (`95 / 85 / 65` ladder), collector reference `moe-estimate.constants` and `community-data` (`65 / 85 / 95` keys), marks `mappers/mod-thresholds` | WP-7 (players), WP-5 (reference), WP-8 (marks); the wire keys `'65'`, `'85'`, `'95'` of the mod API stay as they are, derived from the constant |
| 20 functions far past the ~30-line readability limit | see the list below | the owning package splits each into named steps; pure parsers in `gamedata` and `lib/replay` only if a test pins them first |

The long functions (lines, file, function), measured with the TypeScript AST over `src/**` without tests:

| Lines | Function | Package |
| --- | --- | --- |
| 180 | `gamedata/lib/python-literal` `parseLiteralAt` | WP-13 (gamedata readability pass) |
| 177 | `gamedata/lib/importer/writer/catalog` `writeCatalog` | WP-13 |
| 153 | `lib/auth/lesta-id/lesta-id.plugin` `lestaId` (a plugin factory; the endpoints inside are the long part) | WP-11 alongside auth, or a separate auth pass |
| 153 | `gamedata/lib/armor/join` `joinArmorModel` | WP-13 |
| 122 | `notifications/lib/notification-copy` `messageOf` | WP-9 |
| 117 | `collector/aggregates/lib/build-usage` `summarizeUsage` | WP-5 |
| 104 | `lib/lesta/methods/encyclopedia` `createEncyclopediaMethods` (method table) | Lesta readability pass |
| 103 | `collector/tracking/lib/poll-pipeline` `runPollPipeline` | WP-4 |
| 91 | `mod/services/mod-bind.service` `bind` | WP-9 |
| 83 | `lib/replay/summary` `buildSummary` | replay readability pass |
| 83 | `gamedata/lib/python-literal` `readValue` | WP-13 |
| 80 | `developer/services/webhook-delivery.service` `deliver` | WP-10 |
| 77 | `builds/lib/assemble-loadout` `assembleLoadout` | WP-10 |
| 76 | `analytics/services/playlist.service` `playlist` | WP-7 |
| 76 | `collector/aggregates/services/tank-economy.service` `compute` | WP-5 |
| 76 | `streamers/services/streamer-stats.service` `reply` | WP-12 |
| 74 | `collector/tracking/lib/poll-pipeline` `writeChanges` | WP-4 |
| 73 | `billing/services/webhook.service` `settle` | WP-11 |
| 73 | `modes/services/my-mode-stats.service` `stats` | WP-7 |
| 73 | `progression/services/progression-run.service` `evaluateChallenges` | WP-10 |

(`lib/lesta/methods/account` `createAccountMethods` and `supertest/lib/supertest-article` `parseSupertestArticle`, 73 lines each, sit just below the cut.)

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

> *As built (WP-1):* the extension runs Kysely through Prisma's raw executor, which converts `int8` / `numeric` itself, so pool-level `pg` parsers never see those values (and could not tell an account id from a count, both `int8`). A Kysely result plugin (`NumericResultPlugin`) does the conversion instead: every `int8` and `numeric` in a Kysely row becomes a `number`, and an `int8` beyond `Number.MAX_SAFE_INTEGER` throws. Consequently account ids are `number` in Kysely rows (the generator types `BigInt` columns as `number`) and stay `bigint` in Prisma Client; code converts at the seam. `PrismaExecutor` keeps its old type (existing callers pass plain transaction clients); the Kysely-aware transaction type is `PrismaTransaction`, which `lockedTransaction` passes to `run` and `asPrismaTransaction(tx)` produces for a plain `$transaction`. Query functions take `Database` (`Kysely<DB>`), so they never need the executor union. The snippet above is the shape; the real factory casts the `$extends` result to `PrismaService` once, because `$extends` re-types every delegate and drops `$on`.

Rules:

1. A query function lives in `queries/<topic>.queries.ts`, takes one object `{ db, ...input }` (the repo's object-parameter rule) where `db` is `Database` (`Kysely<DB>`) and returns typed rows. No SQL in services, ever.
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

*Landed.* Rules: `structure/service-files.md` (D1), `structure/module-shape.md` (D2 table, service size, `core/` infrastructure only), new `data/queries.md` (R1 as eight rules, including number semantics and `void` functions), `integrations/outbound-calls.md` (`getJson` with a schema), `testing/environment/server.md` (`mockPrismaService`, the `server-db` project), `testing/shared/{location,running}.md`, `shared/verification.md`, and the server exception in `shared/structure/folders.md`. ESLint block `otmetki/server-raw-sql` (`no-restricted-properties` on `$queryRaw`, `$executeRaw`, both `Unsafe` forms and `Prisma.sql` / `raw` / `join` / `empty`; tests exempt) with the allowlist in `apps/web/server/eslint.raw-sql-allowlist.mjs`: **95 files** (the 96 measured minus `advisory-lock`, ported in WP-1). The server CLAUDE.md went from 65 KB to an overview with a link table; the reference paragraphs moved verbatim to `docs/guides/server/modules.md` (the full module table), `collector.md`, `data.md` (schema, retention incl. the kept-on-purpose list the retention rule points to, locks, `db:push`), and the new `queries.md` guide. Instead of a one-line-per-module table in CLAUDE.md, `modules.md` keeps the table and CLAUDE.md links it.

### Phase 1 — foundations (parallel; no module files touched)

**WP-1 Query layer.** Files: `package.json` (server; catalog if shared), `prisma/base.prisma`, `core/prisma/**`, `vitest.config.ts` (server) + new `vitest.db.config.ts`, `.github/workflows/deploy.yml` (service container for `server-db`), `docker-compose` dev infra if needed. Goal: install `kysely`, `prisma-kysely`, `prisma-extension-kysely`; extend the client; `PrismaExecutor` typed with `$kysely`; `pg` type parsers; `core/prisma/sql-expressions.ts` (`moscowBucket`, `moscowWeekday`, `statSums`, `percentile`); the `server-db` test project with a seeding helper; port `advisory-lock` to Kysely as the pilot with a db test. Done: `prisma generate` emits `generated/kysely`; `bun run dev:all` boots under Bun; pilot test green in CI; the Docker image build still works without a database. Risk: medium — confirm `prisma-extension-kysely` under Bun with `@prisma/adapter-pg` and inside `lockedTransaction` first; if it fails, fall back to a plain `Kysely` instance on the same `pg.Pool` and pass `tx`-bound connections explicitly (still one way to write SQL).

*Landed.* `kysely` 0.29.6 (one copy: a root `overrides` entry pins it, because `prisma-extension-kysely` 4.0.0 declares `^0.27 || ^0.28` while `better-auth` already depends on 0.29.6 and a second copy split `@better-auth/core` into two type identities), `prisma-extension-kysely` 4.0.0, `prisma-kysely` 3.2.1 as a regular dependency (the image installs `--production` and runs `prisma generate`). The extension works under Bun and under Node, inside `lockedTransaction` (a Kysely read sees the transaction's uncommitted insert, a Kysely write rolls back with it — db-tested), no fallback needed. `NumericResultPlugin` replaces the `pg` type parsers (see the note under R1). `core/prisma/sql-expressions.ts`: `statSums` (the 13 stat-sum blocks), `moscowBucket`, `moscowDayText`, `moscowHour`, `moscowWeekday({ weekStartsOn })`, `percentile`, `replayWithoutModBattle` (the 4 dedupe filters; best-battles adds its corroboration condition on top). `server-db`: `vitest.db.config.ts` + `vitest.db.global-setup.ts` (a throwaway `otmetki_test_*` database per run from `timescale.ts --extensions`, `prisma db push`, `timescale.ts`; skips with a warning when no server answers, fails under `SERVER_DB_REQUIRED=true`), helpers in `core/prisma/_tests/test-database.ts` (`describeWithDatabase`, `createTestPrisma`, `truncateTables`), root script `bun run test:db`. Pilot: `lockedTransaction` takes the lock through `tx.$kysely` (`SELECT 1 FROM pg_advisory_xact_lock(...)`; selecting the `void` result directly fails in Prisma's raw layer), with five db tests (same key serialises, different keys run together, the lock is released on a throw, Kysely runs on the transaction connection, Kysely writes roll back). Ten module suites that faked `$transaction` and asserted the lock through `$executeRaw` now build their mock with `mockPrismaService()` (`core/prisma/_tests/prisma-mock.ts`, a dummy-driver Kysely that records queries) and assert with `advisoryLocks(queries)`. Deploy: the `checks` job got the service container and the `test:db` step (not run yet).

**WP-2 Shared helpers.** Files: `common/lib/**`, `packages/ratings` (additions only). Goal: add the shared helpers the module packages will need (ratio/percent with one unit, Moscow time); copy (not move) domain helpers that must leave `common/lib` into their owner later — in this phase only mark them `@deprecated`-free by listing them in the package handover (no comments in code). Done: helpers exported, unit-tested; nothing removed yet. Risk: low.

*Landed.* `common/lib`: `winRatePercent` / `winRateShare` (on `@otmetki/ratings` `winRate`, `null` without battles, unit in the name), `roundTo({ value, digits })`, `paginate({ limit, offset, fetch, count })` → `Paginated<T>`, and `moscow-time` absorbed `week` (`weekWindow`, `previousWeek`) plus an exported `moscowZone` for the module helpers that still build their own `tz(TIME.zone)` (`analytics/lib/daily-reset`, `usage/lib/usage-period`). `MOE.markPercents` needed no new helper; its consumers are listed in §1.5. No call site inside `common/` or `core/` hand-computed a win rate, a rounding or a pagination, so nothing there needed migrating. Domain helpers still in `common/lib` (`entitlement`, `clan-info`, `emblem`, `official-rating`, `career-source`, `mode-blocks`, `session-end`, `bonus-type`) are left for WP-13.

**WP-3 HTTP seam.** Files: `core/http/**`, `src/lib/http/**`. Goal: `getJson({ url, schema, options })` / `getText` with schema parsing and a typed `HttpParseError`; old methods kept until callers move. Done: tests for parse success/failure. Risk: low.

*Landed.* ky 2 validates Standard Schema itself (`.json(schema)`) and throws `SchemaValidationError`, so there is no custom `HttpParseError`. `lib/http` exports `getJson({ url, schema, options })` with a default `retry: HTTP.retry` (`{ limit: 2 }`, ky's GET status list); `HttpClientService.getJson` has a schema overload that delegates to it and keeps the schema-less overload (one attempt, `unknown`) until WP-14. The game-data GitHub reader (`modules/gamedata/lib/source/github`) now goes through `lib/http`: the commit lookup through `getJson` with its schema (`retry: GITHUB.commitRetries`, 0, as before), the raw downloads through `http.get` with `throwHttpErrors: false` under the existing `p-retry`; the injectable `fetch` is now ky's `fetch` option. Three tests added there (sha fallback, the status message, one commit request).

### Decisions (accepted 2026-10-05)

- **D1 — accepted.** R3: one file per topic, barrels only at module boundaries (`.claude/rules/server/structure/service-files.md`; the shared folder rule names the server as its exception).
- **D2 — accepted.** `-reader`, `-writer`, `-sync`, `-aggregate` (`.claude/rules/server/structure/module-shape.md`).
- **D3 — accepted.** The deploy `checks` job starts a `timescale/timescaledb-ha:pg17` service and runs `bun run test:db` with `SERVER_DB_REQUIRED=true`.

### Phase 2 — module migrations (parallel; each owns its modules exclusively)

Each package, for every module it owns: move inline SQL out of services; rewrite each raw query in Kysely (or Prisma Client where it is enough, per §1.2), with a `*.db.test.ts` that pins today's results first (write the test against the old query, keep it green across the rewrite); replace the duplicated stat-sum and playtime SQL with `sql-expressions`; move to the new helper locations (R4) and the HTTP seam (WP-3); apply R2 naming and R3 file shape (D1 accepted); switch service tests to mocking query functions; take over its rows of §1.5 (win rates through `winRatePercent` / `winRateShare`, `roundTo`, `paginate`, `MOE.markPercents`, primary-account lookups through `UserLestaAccountsService`, long functions split); remove the module's files from the raw-SQL lint allowlist.

| WP | Owns | Raw-SQL files | Notes / risk |
| --- | --- | --- | --- |
| **WP-4 Poll write path** | `collector/tracking/**` | `account-writes`, `tracking-store.service`, `claim-active`, `dispatch.service` | Highest risk: the poll transaction, `jsonb_to_recordset` upserts, `SKIP LOCKED`. Pin with db tests over a two-poll scenario (snapshots, deltas, `player_tank`, marks, day session) before touching it. Run the worker against a real account in dev before/after and diff the rows. |
| **WP-5 Collector aggregates** | `collector/aggregates/**`, `collector/reference/**`, `collector/clans/**`, `collector/metrics/**` | `account-ratings`, `account-rating-writes`, `pinned-tiers`, `server-players`, `server-stats`, `tier-maintenance`, `tank-percentiles`, `tank-economy`, `mode-meta`, `learning-curve`, `build-usage`, `tank-boundary`, `build-ranks`, `account-snapshot-window`, `vehicle-sync`, `moe-estimate(-sync)`, `latest-spec-history`, `clan-activity`, `clan-sync`, `metrics.service` | Splits `aggregates` by consumer (ratings, server stats and percentiles, economy and mode meta, build usage, MoE estimate; §1.5). Medium. Uses WP-3 for `expected-values-sync`, `moe-thresholds-sync`, `news-sync`. |
| **WP-6 Purge and retention** | `collector/purge/**`, `auth` account purge | `purge.service`, `retention.service`, `scrub-replay-player` | Lesta-term critical; db tests over a deletion request end to end (hypertables, relational rows, superseded request). Low code volume, high stakes. Wait until the security-fix agent's purge changes are committed. |
| **WP-7 Player stats reads** | `players`, `analytics`, `modes`, `watchlist`, `tanks` | `history-series`, `playtime`, `combined-damage`, `activity-days`, `player-playtime`, `player-history`, `player-marks`, `analytics-overview`, `map-advisor`, `platoon-chemistry`, `battle-review`, `my-mode-stats`, `watchlist-activity`, `tank-trend` | Owns the 13 duplicated stat-sum blocks and both playtime queries (one shared query, keeping both weekday conventions until B1 is decided). Medium. |
| **WP-8 Rankings and feeds** | `leaderboards`, `best-battles`, `clans`, `search`, `maps`, `map-stats`, `honest-rng`, `marks`, `achievements-rarity` | `leaderboard-sql`, `leaderboard.service`, `best-battles-feed/facets` (+ services), `clan-list`, `local-search`, `map-samples`, `maps.service`, `tank-map-stats`, `bonus-modes`, `rotation-counts`, `queue-times`, `map-stats-aggregate`, `rng-battles`, `rng-aggregate`, `moe-curve` (+ service), `tank-owners`, `rollup-update`, `fetch-candidates`, `rarity-aggregate`, `achievements-fetch` | Dynamic sorting and filters: the main beneficiaries of the builder. Medium. |
| **WP-9 Mod and notifications** | `mod`, `notifications`, `session-share` | `battle-corroboration`, `tank-records`, `live-session`, `mod-ratings`, `mod-ingest`, `marks-watch`, `previous-battle-marks` | Ingest signature path untouched; only queries. Medium. |
| **WP-10 Community and the rest** | `social`, `competitions`, `tournaments`, `progression`, `pulse`, `blog`, `builds`, `reference` | `wrapped` (+ 3 queries), `snapshot-events`, `weekly-challenge`, `tank-events`, `record-events`, `challenge-battles`, `competition-scoring`, `competition-battles`, `tournament.service`, `participant-seeds`, `shell-ledger`, `pulse`, `blog-query`, `blog-tags`, `builds-catalog`, `vehicle-catalog`, `thresholds`, `expected-values` | Low–medium; `reference` services are read by many modules, so keep their public interface stable. |
| **WP-11 Billing** | `billing` | none | Only service shape, naming, tests, HTTP seam for the YooKassa client. Start after the security-fix agent's billing changes are committed. Low. |

### Phase 3 — structure (parallel; after phase 2 for the same modules)

**WP-12 Streamers split.** Files: `modules/streamers/**` (137 files, 33 services, `streamers.controller.ts` 368 lines, `streamers.types.ts` 321 lines). Goal: register each of the 8 providers now listed in both `streamers.module.ts` and `streamers-worker.module.ts` once, in a shared module both import (§1.5), and split into Nest modules by concern — profiles/directory/claims, overlays (data, SSE, preview), integrations (Twitch, DonationAlerts, VK, YouTube), challenges and auto-predictions — with one controller per concern; replace the hand-rolled Helix calls in `live-platforms.service.ts` with the existing `@twurple/api` client from `twitch-sdk.service.ts`; YouTube/VK through the WP-3 seam. Done: no file in streamers > 200 lines, no hand-written Helix URL, routes and OpenAPI unchanged. Risk: medium (overlay SSE and chat lifecycles).

*Landed.* Nine sub-modules under `modules/streamers/`, each registering its providers once: `integrations` (store, OAuth state, connect flow, the Twitch and DonationAlerts SDK wrappers), `live` (live platforms, live status, feed reader), `profiles` (profile, cards, directory, claims with `ClaimTransferWriterService` split out, invitations, moderation, follows), `settings` (settings, aggregate, share), `overlays` (overlay, data with `OverlayStatsReaderService` split out, SSE stream) plus `StreamerOverlayPublisherModule` (publisher only, because the worker has no cache manager), `chat` (stats, announcer, Twitch chat, VK stub, chat i18n), `panel` (the Twitch panel: API-only, it needs the cache manager and `BotCommandsModule`), `challenges` (`StreamerChallengesModule` with `ChallengeService` for both apps, `StreamerChallengesWorkerModule` with the feed and the DonationAlerts listener) and `predictions` (`StreamerPredictionsModule`, and the global `StreamerEventsModule` with the `BATTLE_EVENTS` trigger). Worker-only modules hold the services with connection lifecycles (`TwitchChatService`, `DonationListenerService`), so the API never imports them. `StreamersModule` (API) imports the sub-modules and declares the eleven controllers in an order that keeps Express precedence (`/streamers/settings`, `/me`, `/live` before `/:slug`; `twitch-panel/:channelId` and the OAuth callback before `/:slug/*`); `StreamersWorkerModule` imports the sub-modules and adds the processor. The split controllers keep their `StreamersController_*` operation ids through `@OperationIdPrefix` (`common/decorators`), so the generated client is unchanged; the OpenAPI document is identical after sorting keys, only the order of `paths` changed. Twitch live status and bios use `ApiClient` + `AppTokenAuthProvider` (`streams.getStreamsByUserNames`, `users.getUserByName`). The challenge feed runs on `advanceWatermark`; oauth-state compares bindings with `common/lib` `timingSafeEqual`.

**WP-13 Collector and core layout.** Files: `modules/collector/{board,monitoring,producer,queues,schedules,contracts}/**`, `core/user-lesta-accounts`, `core/battle-events`, `common/lib` domain helpers (the moves prepared in WP-2) and their importers. Goal: move domain services out of `core/`, domain helpers out of `common/lib`, delete the then-unused copies. This is the one package that edits import lines across modules, so it runs alone, after phase 2. Done: `common/lib` holds only domain-free helpers; `core/` only infrastructure; import-cycle test green. Risk: low–medium (import cycles; `src/_tests/import-cycles.test.ts` guards it).

*Landed.* `core/` is prisma, redis, http, scrape, storage, logger, queues, lesta and token-cipher only. `core/user-lesta-accounts` became the `accounts` module (`AccountsModule`, `UserAccountsReaderService`, `USER_LESTA_ACCOUNT_ORDER`). The three event ports left `core/` for the module that emits through them: `BATTLE_EVENTS` → `mod` (streamers already depended on `mod`), `SESSION_EVENTS` → `developer` (`session-close` emits, `session-share` implements). The webhook port (`WEBHOOK_EMITTER`, its types, `markGainedKey`) cannot live in `developer`: `developer` imports `collector`, and `collector` and `mod` emit webhooks, so it is the contract-only module `modules/webhooks` that `developer` implements. `common/lib` domain helpers moved to their owners and leave their module through its barrel: `bonus-type` → `reference`, `career-source` and `mode-blocks` → `collector/tracking`, `clan-info` → `collector/clans` (both through the collector barrel, because `players` and `clans` import `collector`, not the reverse), `emblem` → `clans`, `entitlement` → `billing`, `official-rating` → `leaderboards`, `session-end` → `developer`. Kept in `common/lib`: `rating` (`ratingValue` only maps a number to the `RatingValue` wire shape through `@otmetki/ratings` `ratingTier`, used by seven modules with no owner) and `enums` (the DB-enum mappings, persistence glue). `ratio` stays as decided in §1.5; the last server `safeDivide` calls (`collector/aggregates/server/lib/server-stats`) are `ratio(...) ?? 0`, same values. Primary-account lookups: `auth` `LestaAccountsService.primaryAccountId`, `community-core` `accountOf`, `missions` `garageTanks` and `mod` bind go through `UserAccountsReaderService`. Kept: `notifications` `first-win-reminders` (picks the primary among accounts active in the last days, not the primary), `me` `linked-accounts` (picks the next primary after an unlink, oldest first), the relation selects in `bot-commands` `BOT_USER_SELECT` and `discord` `standingOf` (the primary account inside a larger single query; they use `USER_LESTA_ACCOUNT_ORDER`), and the unordered account-id sets (`billing`, `clan-workspace`, `recruiting`). D2 renames: `LeaderboardReaderService`, `ClanListReaderService`, `ClanPageReaderService`, `MoeTableReaderService`, `SweatIndexReaderService`, `PlayerHistory/Marks/Sessions/Summary/TanksReaderService`, `FirstWinReaderService`, `OwnAccountReaderService`, `PlaylistReaderService`, `TankDetail/Difficulty/StatsReaderService`, `TierListReaderService`, `BuildDataReaderService`, and in `reference` `BronyaReferences/ExpectedValues/GameVersion/OfficialRatingTypes/ServersOnline/ThresholdsReaderService`; `CosmeticsService` split into `CosmeticsReaderService` (inventory, profiles, overlay themes; exported) and `CosmeticsWriterService` (purchase, equip; API only). Kept on purpose: `VehicleCatalogService` (92 importing files) and the billing services (renames there wait for the owner), `ClanResolverService` and `PlayerResolverService` (read-through: resolve an id, fetch from Lesta and upsert on a miss — neither reader nor writer), `ModDeviceService` (device registry and signed-request authentication). Collector sub-modules: `board` and `monitoring` keep their single service at the root, the segment barrels in `monitoring/config`, `producer/config`, `queues/providers` and `schedules/config` are gone. The OpenAPI documents are byte-identical.

### Phase 4 — finish (sequential)

**WP-14 Cleanup.** Delete the raw-SQL lint allowlist (must be empty), remove the old `HttpClientService` methods, run `bun run lint:unused` and `bun run lint:dupes` and fix what the refactor left, re-measure §1 and append the numbers to this doc. Done: zero `$queryRaw`/`Prisma.sql` outside `core/prisma/lib/advisory-lock` if it stays raw; numbers recorded.

*Landed.* The raw-SQL allowlist (empty) is deleted; the `otmetki/server-raw-sql` ban stays with only tests exempt, and no `$queryRaw` / `Prisma.sql` is left in `src/` or `scripts/`. `HttpClientService` keeps `getText` and the schema forms of `getJson` / `requestJson` only (live platforms, the poliroid MoE sync through a transforming schema, the XVM sync through `getText`). Every segment and per-item barrel inside a module is gone (≈ 580 `index.ts` removed in this package, including `lib/<concern>/index.ts`); barrels remain at module roots, collector and streamers sub-module roots, `core/<x>`, `src/lib/<client>`, `config/`, `common/<x>` and `openapi/`. Folder-per-item mappers and selects became `<topic>.mappers.ts` / `<topic>.selects.ts`; guards, decorators and interceptors are one flat file each. About 105 services got a D2 name (and `MissionProgressService`, `HeatmapService`, `StreamerSettingsService` split into reader + writer); the 94 kept names are infrastructure, transports, SDK wrappers, buses, queue producers, bot command handlers, watcher jobs that turn table state into messages, and the WP-13 precedents. knip for the server ignores type-only re-exports in barrels (`knip.json` `ignoreIssues`) and reports nothing; jscpd finds three clones, all import blocks or look-alike CTE heads with different columns (left). Defects fixed on the way, each with a test, and the behaviour decisions still open are listed in the WP-14 report; the retention audit's gaps wait for the owner.

### WP-14 re-measure (2026-10-05)

| Metric | Before (§1.1) | After |
| --- | --- | --- |
| Source files / lines (tests excluded) | 3,185 / 80,138 | 2,359 / 81,646 |
| Test files (db tests) | 716 (0) | 771 (68) |
| Directories under `src/` | 1,581 | 1,483 |
| `index.ts` barrels | 1,059 | 116 |
| Services / without a D2 suffix | 345 / — | 356 / 94 |
| Files with Prisma raw SQL | 96 | 0 |
| Server unit tests | — | 703 files, 4,570 tests |
| `test:db` | — | 68 files, 309 tests |
| OpenAPI (public, internal) | — | byte-identical to the pre-WP-14 export |

Parallelism: phase 1 runs WP-1/2/3 at once; phase 2 runs WP-4 … WP-11 at once (8 agents, disjoint modules); phase 3 runs WP-12 alongside WP-13 only if WP-13 does not touch streamers imports (otherwise sequential).

## 4. Bug and inconsistency items

Found during the review; **not** part of the refactor. Each needs an owner decision and its own change.

- **B0 — fixed in `c0a270973`** (the poll casts to `stats_mode` now; confirmed on the dev database that `'all'::"StatsMode"` fails with "type does not exist"). Original note: **(likely runtime error, fix first, separately from the refactor).** `collector/tracking/services/tracking-store.service.ts:200` (`latestAccountBattles`) casts `'all'::"StatsMode"`. The Postgres enum is `@@map("stats_mode")` (`prisma/schema/snapshots.prisma:15`); no type `"StatsMode"` exists, so the statement should fail with "type does not exist" whenever it runs. Tests mock it (`poll-pipeline.fixtures.ts`). Verify against the dev database, then fix (`::stats_mode`, or two `findFirst` calls) with a db test.
- **B4 Performance, not behaviour:** the four `best-battles-facets` queries each rebuild the same corroborated CTE (4 scans per request), and `clan-list` uses `(${x}::t IS NULL OR …)` catch-all filters that defeat index use. Fix during WP-8 only if result-identical; otherwise file separately.
- **B1 Weekday convention differs between sibling endpoints.** `analytics-overview.service.ts` (`battlePlaytime`, `deltaPlaytime`) uses `extract(dow …)` → 0 = Sunday; `players/queries/playtime` uses `extract(isodow …) - 1` → 0 = Monday. Both are documented that way in `@otmetki/schemas` (`analytics.schemas.ts:72`, `players.schemas.ts:236`), and `analytics/lib/playtime-split` imports `PlaytimeRow` from players, so one row type carries two meanings. Proposal: Monday-first everywhere (Moscow), contract change in both schemas and the client.
- **B2 Playtime scope differs.** Analytics counts only random battles (`battle_type = ANALYTICS_SQL.randomBattleType`) from mod battles; the player page's playtime counts every battle type from the same table. Decide whether the player page should be random-only too.
- **B3 Stats-mode literal not from one constant.** `'random'::stats_mode` is hard-coded in `analytics-overview.service.ts` (4 times in 2 files) while other queries use `PLAYER_STATS.snapshotMode` / `STATS_MODE_SQL`. Same value today; fold into the constant during WP-7 (no behaviour change).

## Sources

- [Prisma TypedSQL docs](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/typedsql) — preview, `prisma-client` generator only, database required at generate, no dynamic SQL.
- [prisma-extension-kysely](https://github.com/eoin-obrien/prisma-extension-kysely) — v4 requires Prisma 7 and a driver adapter; interactive transactions through `tx.$kysely`.
- [prisma-kysely releases](https://github.com/valtyr/prisma-kysely/releases) / [npm](https://www.npmjs.com/package/prisma-kysely) — 3.x supports Prisma 7 (Bun or Node ≥ 22).
- [Kysely: generating types](https://kysely.dev/docs/generating-types).
