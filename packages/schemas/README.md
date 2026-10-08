# @otmetki/schemas

Zod contracts shared by [apps/web/client](../../apps/web/client/README.md) and [apps/web/server](../../apps/web/server/README.md) (API and worker); `@otmetki/icons` reads its `VehicleType` too. The API validates against these schemas and the client reads its types from them, so a contract is defined once. Server-only request validation may live in a module's `dto/*.schemas.ts` instead.

## Usage

```ts
import { playerTanksQuerySchema } from '@otmetki/schemas';
import type { PlayerSummary } from '@otmetki/schemas';
```

Import from the package root only; there are no subpath exports.

## Layout

One folder per domain under `src/` (`players`, `tanks`, `clans`, `developer`, `mod`, `billing`, …). The file suffix says what a file holds:

| Suffix          | Holds                                                |
| --------------- | ---------------------------------------------------- |
| `.schemas.ts`   | zod schemas                                          |
| `.types.ts`     | `z.infer` types                                      |
| `.constants.ts` | plain data (limits, code lists) the schemas build on |

`common/` holds the pieces every domain reuses:

- `primitives`: ids, nickname and clan tag, ISO dates, `ratioSchema` (0–1), `percentSchema` (0–100), `percentDeltaSchema` (−100…100 percentage points) and `countSchema`.
- `query`: `listParam` for `a,b,c` query lists, `booleanParam`, `sortQuery`, and the pagination and cursor schemas.
- `period`: recent, rating and server periods, stats modes and skill cohorts.
- `rating`: `ratingValueSchema` and `statsBlockSchema`.
- `brand` and `internal-request`: the product names (`BRAND`) and the internal-token and client-IP headers the client's server sends to the API (`INTERNAL_REQUEST`).

## Testing

Run from the repo root with `bun run test`; `bun run typecheck` checks every consumer.

## Reference

### Units

Every rate in a response is a percent from 0 to 100: `winRate`, `playerWinRate`, `avgWinRate`, `survivalRate`, `accuracy`, `moePercent`. Differences of rates (`winRateDiff`, `winRateDelta`) are percentage points. `ratioSchema` (0–1) is kept for true fractions such as a share of a sample.

### Owned elsewhere

Some values belong to [`@otmetki/ratings`](../ratings/README.md), and the schemas are built from them so the two cannot drift apart:

- `ratingTierSchema` is built from `RATING_TIERS`.
- `recentPeriodSchema` is built from `RECENT_PERIODS`, the keys of `PERIOD_WINDOWS`.

The rules for writing a shared schema: [docs/guides/shared/schemas.md](../../docs/guides/shared/schemas.md).
