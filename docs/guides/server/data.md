# Data: schema, retention, concurrency

Part of the [style guide](../README.md). Overview: [apps/web/server/CLAUDE.md](../../../apps/web/server/CLAUDE.md); SQL beyond Prisma Client: [queries.md](queries.md).

## Schema

134 models and one view (`TankDailyStats`) across `prisma/schema/*.prisma`, one file per domain (plus `base.prisma` for the generator and datasource). Several concerns share one table with a discriminator instead of a table each — keep it that way when adding a variant:

- `follow` (`kind`: player / clan / tank) holds follows, favourites, own accounts and the watchlist; `watchlist.prisma` holds only its enum.
- `play_session` (`source`: api / mod, `kind`: day / live) holds the API day rollups and the mod's live sessions.
- `mod_sync_library` (`kind`: sets / profiles) holds the manager's synced component sets and settings profiles, one JSON library per user and kind.
- `tank_threshold` (`kind`: moe / mastery) holds both threshold histories; `game_data_entry` (`kind`, `key`) holds the imported game data; `comment` and `reaction` point at any `CommentTarget`.

`account_mode_stats` and `tank_mode_stats` keep only the latest lifetime block per account (and tank) and mode, written by the poll from the Lesta mode blocks; the `random` row of `account_mode_stats` is written from the latest random account snapshot instead, and every row carries `max_*_at`, set when a lifetime record grows (the player career dates its records from them instead of scanning `account_snapshot`); like `player_tank` they grow with accounts, not with time, and go with the player row. `mod_sync_library` likewise grows with users (at most two rows each) and goes with the user: the account purge deletes it and the rows cascade with the `user` row.

## Retention

Retention is part of the schema contract: every table that grows with time has a rule — the Timescale policies (`TIMESCALE`) for hypertables, `RETENTION` in `modules/collector/purge/config` (batched deletes per table and column) for the rest, and the purge jobs for deletion requests. A new growing table gets a rule in the same change. Kept on purpose, with no rule: `shell_ledger_entry` (the «Гильзы» balance is the sum of the ledger), `news_item` (the public news archive, a few rows a day), `vehicle_spec_history` (patch history per vehicle, one row per changed spec per game version), `player_nickname_history` (nickname history shown on the player page; removed with the account by the purge jobs) and `blog_post` (the editorial archive, a few rows a month; an author's deletion only nulls `author_user_id`).

## Concurrency and time

Concurrency: writes that must not interleave go through `lockedTransaction({ prisma, scope, key, run })` (`core/prisma/lib/advisory-lock`, `pg_advisory_xact_lock`; its `run` gets a `PrismaTransaction` whose `tx.$kysely` runs on the same connection): scope `poll` per account in the collector, and `LIMIT_LOCK_SCOPE` (`apiKeys`, `webhooks`, `overlays`, `goals`, `replays`, `linkedAccounts`) around every "count then insert" quota check. Moscow time (`TIME.zone`) is the only calendar: day sessions, weekly windows (`common/lib/week`, `moscow-time`) and every cron `pattern` (`createJobSchedules` passes `tz: TIME.zone`).

## Syncing the schema

The schema is split across `prisma/schema/`; the client is generated into `generated/` on `postinstall`, together with the Kysely `DB` type in `generated/kysely/` (the `prisma-kysely` generator in `base.prisma`, a regular dependency so the production image generates it too). There are no Prisma migrations before production: `bun run db:push` runs `scripts/timescale.ts --extensions` (pg_trgm and timescaledb, which the trigram indexes need), `prisma db push`, `prisma generate` and then the whole Timescale layer (`bun run db:timescale`: `prisma/sql/timescale/*.sql` — hypertables, compression, continuous aggregates — plus the policies from `TIMESCALE`; every statement is idempotent). Hypertables carry no foreign keys — the purge deletes their rows explicitly. The continuous aggregate `tank_daily_stats` depends on `tank_battle_delta` columns, so it is versioned: `db:timescale` stamps the view's comment with a hash of `003_continuous_aggregates.sql`, and whenever the stored hash differs (or is missing) it drops the view — already in the `--extensions` step, before `prisma db push` needs its columns gone — recreates it, stamps it and backfills it in full. Editing the SQL file is enough; `bun run db:push` handles the rest. Production runs `bun run db:deploy` (the same steps without `prisma generate`, which the image already did) — see [docs/ops/deploy.md](../../../docs/ops/deploy.md). Its column list lives in `prisma/sql/timescale/003_continuous_aggregates.sql` and the `view TankDailyStats` block, which must match.
