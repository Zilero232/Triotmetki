# @otmetki/ratings

Pure rating math for «Мир танков»: WN8, EFF, our Броня-Индекс, the rating colour tiers, recent periods, marks of excellence and win-rate statistics. No I/O: callers pass totals, expected values and reference tables. The server (API and collector), the client and `@otmetki/schemas` all compute ratings through this package, so a number means the same everywhere.

## Usage

```ts
import { accountWn8, eff, ratingTier, projectMoeBattles } from '@otmetki/ratings';
```

Totals are cumulative and camelCase (`TankTotals`); map Lesta's snake_case blocks before calling. The public API is what [src/index.ts](src/index.ts) re-exports:

| Area                | Exports                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| WN8                 | `tankWn8`, `accountWn8`, `WN8`, `parseXvmExpectedValues`                                                                        |
| EFF                 | `eff`, `averageTier`, `EFF`                                                                                                     |
| Броня-Индекс        | `bronyaIndex`, `percentileOf`, `BRONYA_INDEX`, `BRONYA_COMPONENTS`                                                              |
| Rating tiers        | `ratingTier`, `RATING_SCALES`, `RATING_TIERS`                                                                                   |
| Recent periods      | `pickSnapshotPair`, `periodRatings`, `PERIOD_WINDOWS`, `RECENT_PERIODS`                                                         |
| Marks of excellence | `moeCombinedDamage`, `nextMoeEma`, `moeAlpha`, `moeMarks`, `moeDamageForPercent`, `projectMoeBattles`, `toMoeThresholds`, `MOE` |
| Mastery             | `masteryThresholds`, `MASTERY_LEVELS`, `MASTERY_PERCENTILES`                                                                    |
| Statistics          | `sumTotals`, `computeAverages`, `winRate`, `winRateDiffFromAggregate`, `wilsonInterval`                                         |

## Layout

One folder per concern under `src/`: `wn8`, `eff`, `expected-values`, `bronya-index`, `scale`, `period`, `moe`, `mastery`, `stats`, `win-rate`, `wilson`, `interpolation`. Constants live in each folder's `*.constants.ts`.

## Testing

Tests live in `src/**/_tests`; run them from the repo root with `bun run test` (or `bunx vitest run packages/ratings`).

## Reference

### WN8

The standard formula:

```text
rX      = actual per-battle X / expected X          (rWin uses win rate % / expWinRate)
rWINc   = max(0, (rWIN - 0.71) / 0.29)
rDAMAGEc= max(0, (rDAMAGE - 0.22) / 0.78)
rFRAGc  = max(0, min(rDAMAGEc + 0.2, (rFRAG - 0.12) / 0.88))
rSPOTc  = max(0, min(rDAMAGEc + 0.1, (rSPOT - 0.38) / 0.62))
rDEFc   = max(0, min(rDAMAGEc + 0.1, (rDEF  - 0.10) / 0.90))
WN8     = 980·rDAMAGEc + 210·rDAMAGEc·rFRAGc + 155·rFRAGc·rSPOTc + 75·rDEFc·rFRAGc + 145·min(1.8, rWINc)
```

Account WN8 sums actual totals and `expected × battles` over the tanks that have expected values; tanks without them are reported in `tanksWithoutExpected` and excluded from both sides. A player exactly on expectation scores 1565. WN7 is not implemented.

Expected values load from the XVM format `{ header, data: [{ IDNum, expDef, expFrag, expSpot, expDamage, expWinRate }] }` with `parseXvmExpectedValues` (numeric strings are accepted).

### EFF

```text
EFF = DMG·(10 / (TIER + 2))·(0.23 + 2·TIER / 100) + FRAGS·250 + SPOT·150 + log₁.₇₃₂(CAP + 1)·150 + DEF·150
```

Per-battle averages; `TIER` is the battle-weighted average tier (`averageTier`).

### Recent periods

Snapshots are cumulative, so a period is `to − from` (`periodRatings`). `pickSnapshotPair` takes the newest snapshot as `to` and, as `from`, the newest snapshot at or before the window start (`now − days`, or `to.battles − N` for last-N-battles). If no snapshot is old enough, the earliest one is used and `isPartial` is set. Because snapshots are written only on change, a last-N window can cover slightly more than N battles. `PERIOD_WINDOWS` maps each public period id in `RECENT_PERIODS` (`24h`, `7d`, `30d`, `60d`, `1000`) to its window; `@otmetki/schemas` builds `recentPeriodSchema` from the same list.

### Броня-Индекс (0–10 000)

Our own skill index. It answers "on the tanks you play, what share of the server do you beat?".

Inputs per tank: the player's totals and a server reference with quantile values for five components at the levels `BRONYA_INDEX.quantileLevels` (5, 10, 25, 50, 75, 90, 95, 99 %). References come from `tank_daily_stats` in the collector.

1. For each component (average damage, win rate, frags, spotted, defence points) the player's per-battle value is converted to a server percentile `p ∈ [0, 1]` by piecewise-linear interpolation between the quantile points, anchored at `(0, 0)`, extrapolated from the top segment and clamped to 1.
2. Tank score `s = 0.45·p_damage + 0.20·p_winRate + 0.15·p_frags + 0.10·p_spotted + 0.10·p_defence`.
3. Small samples shrink toward the median: `s' = (b·s + K·0.5) / (b + K)` with `b` battles on the tank and `K = 20` prior battles.
4. Account score is the battle-weighted mean of `s'`; the index is `round(10 000 · score)`. `confidence = B / (B + K)` for total covered battles `B`.

A median player on every tank scores 5000. Being percentile-based, the index is comparable across tiers and classes and does not need expected-value tables.

### Rating colour scale

`ratingTier({ scale, value })` maps WN8, EFF, win rate and Броня-Индекс onto nine tiers (`very_bad` … `super_unicum`). Lower bounds live in `RATING_SCALES`; they follow the XVM / wotlabs community scales (WN8 and win rate from wotlabs, EFF from XVM) and percentile bands for Броня-Индекс.

### Marks of excellence (approximation)

The game does not publish the MoE model. We use the community approximation:

- Per battle, combined damage = `damage + max(spotting assist, tracking assist, stun assist)` (`moeCombinedDamage`).
- The game keeps an exponential moving average of combined damage: `ema ← ema + α·(combined − ema)` with `α = 2 / (N + 1)`, `N = 100` battles (`MOE.emaBattles`, `nextMoeEma`).
- The MoE % is the server percentile of that EMA. We only know the EMA values at 65 / 85 / 95 % (thresholds from poliroid-style data or our own mod data), so the percent ↔ EMA curve is piecewise-linear through `(0, 0)`, the three thresholds and the 100 % point (given, or extrapolated from the 85→95 slope).
- Projection (`projectMoeBattles`): with current EMA `E`, target EMA `T` and a constant average `D > T`, `E_n = D + (E − D)(1 − α)^n`, so `n = ⌈ln((D − T) / (D − E)) / ln(1 − α)⌉`. `null` means `D ≤ T` (unreachable at that average).

Real distributions are not linear between thresholds and the server smoothing may differ, so projections are estimates.

### Mastery and win-rate statistics

- `masteryThresholds` reads the XP needed for each mastery badge from a `tanks/mastery` XP distribution at the 50 / 80 / 95 / 99 percentiles; `MASTERY_LEVELS` maps the API `mark_of_mastery` (0–4) to `none | third | second | first | ace`.
- `winRateDiffFromAggregate`: the tank's win rate minus the battle-weighted overall win rate of the players who drove it, `Σwins / Σb − Σ(b·WR_overall) / Σb`.
- `wilsonInterval({ rate, trials, z })`: the Wilson score interval of a percentage over `trials` (z = 1.96, 95 %), in percent. Ranking by its lower bound (or the upper one for an ascending sort) puts 5 000 battles at 60 % above 60 battles at 70 %; a tiny sample (6 battles at 100 %) still needs a minimum-battles floor on top.
