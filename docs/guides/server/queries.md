# Queries: Prisma Client and Kysely

Part of the [style guide](../README.md). The rule digest is [.claude/rules/server/data/queries.md](../../../.claude/rules/server/data/queries.md); why Kysely and not TypedSQL or Drizzle is in [the refactor plan](../../specs/2026-10-05-server-refactor.md#r1-one-way-to-write-sql-kysely-through-prisma).

## Which tool

| Need                                                                                                                      | Tool                                   |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| CRUD, relations, `groupBy`, `createMany({ skipDuplicates })`, anything Prisma Client says directly                       | Prisma Client                          |
| Aggregates Prisma cannot express, `DISTINCT ON`, `LATERAL`, window functions, `percentile_cont`, CTEs, trigram search, `FOR UPDATE SKIP LOCKED`, conditional bulk upserts, Moscow-time bucketing | Kysely (`db.selectFrom(...)`)          |
| Hypertables, compression, continuous aggregates                                                                           | `prisma/sql/timescale/*.sql` (schema)  |

Prisma's raw API (`$queryRaw`, `$executeRaw`, `Prisma.sql` / `raw` / `join` / `empty`) is banned by ESLint outside [the allowlist](../../../apps/web/server/eslint.raw-sql-allowlist.mjs) of files not yet moved.

## How Kysely is wired

- `prisma/base.prisma` has a second generator, `prisma-kysely`, which writes `generated/kysely/database.ts` (the `DB` type: one entry per table and view, snake_case columns as in the database) and `enums.ts` on every `prisma generate`. The types can never drift from the schema. `BigInt` and `Decimal` columns are typed `number` (see below).
- `createPrismaClient` (`core/prisma/prisma.factory.ts`) extends the client with [`prisma-extension-kysely`](https://github.com/eoin-obrien/prisma-extension-kysely): `prisma.$kysely` compiles a query with Kysely and runs it through Prisma's own raw executor, so it shares Prisma's pool, logging and errors. Inside `prisma.$transaction(async (tx) => …)` the extension hands the callback a `tx.$kysely` bound to the transaction's connection; `lockedTransaction` passes it on as `PrismaTransaction`, and `asPrismaTransaction(tx)` gives the same type to a plain `$transaction` callback.
- `core/prisma/kysely.ts` builds the Kysely instance (Postgres compiler, `NumericResultPlugin`). `Database` (`Kysely<DB>`) is the type a query function takes.

## Writing a query function

```ts
// modules/players/queries/player-activity.queries.ts
import type { Database } from '../../../core';

import { moscowDayText, statSums } from '../../../core';
import { PLAYER_STATS } from '../config';

export const activityDays = ({ db, accountId, from }: ActivityDaysInput) =>
  db
    .selectFrom('tank_battle_delta')
    .select(moscowDayText('captured_at').as('day'))
    .select(statSums(['battles', 'wins']))
    .where('account_id', '=', accountId)
    .where('mode', '=', PLAYER_STATS.snapshotMode)
    .where('captured_at', '>=', from)
    .groupBy('day')
    .orderBy('day')
    .execute();
```

The service calls `activityDays({ db: this.prisma.$kysely, accountId, from })`, or `db: tx.$kysely` inside a transaction. The row type (`{ day: string; battles: number; wins: number }[]`) is inferred; there is no hand-written row type to keep in sync.

The same query before, for comparison:

```ts
export const activityDaysSql = ({ accountId, from }: ActivityDaysSqlInput) => Prisma.sql`
  SELECT to_char(captured_at AT TIME ZONE ${TIME.zone}, 'YYYY-MM-DD') AS day,
         sum(battles)::float8 AS battles,
         sum(wins)::float8 AS wins
  FROM tank_battle_delta
  WHERE account_id = ${accountId} AND mode = ${PLAYER_STATS.snapshotMode}::stats_mode AND captured_at >= ${from}
  GROUP BY 1
  ORDER BY 1
`;
// in the service: this.prisma.$queryRaw<ActivityDayRow[]>(activityDaysSql({ accountId, from }))
```

- Optional filters: `.$if(tankId !== undefined, (q) => q.where('tank_id', '=', tankId!))` — no `Prisma.empty` glue.
- Dynamic columns: `sql.ref(\`account_rating.${COLUMN[query.metric]}\`)` over a typed key union.
- Bulk writes: `db.insertInto('player_tank').values(rows).onConflict((oc) => oc.columns([...]).doUpdateSet(...))`.
- An expression the builder lacks goes into `core/prisma/sql-expressions.ts` once: `statSums` (the per-tank stat sums — `battles`, `wins`, `damage`, `frags`, `spotted`, `cap`, `def`, `survived`, …), `moscowBucket`, `moscowDayText`, `moscowHour`, `moscowWeekday({ weekStartsOn })` (both weekday conventions until B1 of the plan is decided), `percentile`, and `replayWithoutModBattle` (the "replay no mod battle already covers" filter, used as `.where(replayWithoutModBattle)` on `selectFrom('replay')`).

## Numbers and types

Prisma's raw executor returns `int8` as `bigint` and `numeric` as `Prisma.Decimal`; that is why the old queries carry 114 `::float8` casts. `NumericResultPlugin` converts both to `number` in every Kysely result — counts, `sum(int)`, `sum(bigint)`, `avg`, `extract`, `bigint` columns including account ids, `numeric(10,2)` money — and throws a `RangeError` for an `int8` beyond `Number.MAX_SAFE_INTEGER` rather than lose digits. So:

- no casts for the driver's sake: `eb.fn.countAll<number>()`, `eb.fn.sum<number>('battles')`, `statSums([...])` already come back as numbers;
- a Kysely row's `account_id` is a `number`; Prisma Client's is a `bigint`. Convert where the two meet (`BigInt(row.account_id)` for a Prisma `where`), never inside a query;
- timestamps come back as `Date`, `json`/`jsonb` already parsed (`unknown` in the types), enums as their string values.

A function that returns `void` cannot be selected — Prisma refuses to deserialize the column (`UnsupportedNativeDataType`). Call it from `FROM` and select a literal, as `core/prisma/lib/advisory-lock` does:

```ts
tx.$kysely
  .selectFrom((eb) => eb.fn('pg_advisory_xact_lock', [eb.fn('hashtext', [eb.val(scope)]), eb.fn('hashtext', [eb.val(key)])]).as('lock'))
  .select((eb) => eb.lit(1).as('locked'))
  .execute();
```

## Testing

Every query function gets a `*.db.test.ts` in the segment's `_tests/`, run by the `server-db` project against a throwaway TimescaleDB (`bun run test:db`; setup in [.claude/rules/testing/environment/server.md](../../../.claude/rules/testing/environment/server.md)). When a raw query is moved, write the test against the old query first and keep it green across the rewrite.

```ts
describeWithDatabase('activityDays', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_battle_delta'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sums a Moscow day across tanks', async () => {
    await prisma.tankBattleDelta.createMany({ data: [/* … */] });

    expect(await activityDays({ db: prisma.$kysely, accountId: 1, from })).toEqual([{ day: '2026-10-05', battles: 5, wins: 3 }]);
  });
});
```

A service test does not touch the database: it builds its Prisma mock with `mockPrismaService()` (`core/prisma/_tests/prisma-mock.ts`), whose `$kysely` compiles queries against a dummy driver and resolves to no rows, and replaces the query functions it calls through an injected seam.
