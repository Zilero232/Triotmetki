---
paths:
  - "apps/web/server/**/*.ts"
  - "apps/web/server/prisma/**"
---

<!-- Compressed editing rules for the server app (API and worker), loaded automatically on edit. -->
<!-- The full guide is docs/guides/server/queries.md. Keep them in sync. -->

# Code style — server: queries

## One way to write SQL: Kysely through Prisma

Prisma Client is the default for CRUD and anything it expresses directly. **Everything
else is Kysely** — typed from the Prisma schema (`prisma-kysely` writes
`generated/kysely` on every `prisma generate`) and running on Prisma's connection:
`this.prisma.$kysely` outside a transaction, `tx.$kysely` inside `$transaction` /
`lockedTransaction`. Never `$queryRaw`, `$executeRaw`, their `Unsafe` forms,
`Prisma.sql`, `Prisma.raw`, `Prisma.join` or `Prisma.empty` in new code: the
`otmetki/server-raw-sql` ESLint block bans them outside
`apps/web/server/eslint.raw-sql-allowlist.mjs`, a list of not-yet-moved files that only
shrinks — moving a file to Kysely deletes its line.

1. A query function lives in `queries/<topic>.queries.ts`, takes `{ db, ...input }`
   with `db: Database` (`Kysely<DB>` from `core`) and returns typed rows. No SQL in a
   service.
2. Use the builder (`selectFrom`, `where`, `$if`, `with`, `distinctOn`,
   `innerJoinLateral`, `onConflict`). The `sql` tag only for an expression the builder
   lacks, and each such expression lives once in `core/prisma/sql-expressions.ts`
   (`statSums`, `moscowBucket`, `moscowDayText`, `moscowHour`, `moscowWeekday`,
   `percentile`, `replayWithoutModBattle`) — never inline twice.
3. Dynamic columns come from `sql.ref()` over a typed key union, never interpolation.
4. Bulk writes: `insertInto(...).values(rows).onConflict(...)`, not `jsonb_to_recordset`.
5. Every number comes back as a JS `number`: the `NumericResultPlugin` turns `int8`
   (counts, `sum(int)`, `bigint` columns, account ids) and `numeric` into numbers and
   throws on an `int8` past `Number.MAX_SAFE_INTEGER`. No `::float8` / `::int` casts for
   the driver's sake. Prisma Client still returns `bigint` for `BigInt` columns — convert
   at the seam (`BigInt(row.account_id)`), never inside a query.
6. A function returning `void` (`pg_advisory_xact_lock`, `pg_sleep`) cannot be selected:
   Prisma's raw layer refuses the column type. Call it from `FROM` and select a literal
   (see `core/prisma/lib/advisory-lock`).
7. Timescale DDL stays in `prisma/sql/timescale/*.sql`, applied by `scripts/timescale.ts`.
8. Every query function has a `*.db.test.ts` against a real TimescaleDB
   (`testing/environment/server.md`). A service test replaces the query functions it
   calls through an injected seam (the module's queries object, passed in the
   constructor), never `vi.mock`, and asserts on returned values, not call shapes.
