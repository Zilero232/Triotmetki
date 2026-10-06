# Modpack library audit — 2026-10-06

Scope: the whole of `apps/game/modpack`:

- `ui-web` (Vite React 19 for Gameface): 1,328 non-test files, ~19.3k lines.
- The Python 2.7 game code in `packages/*` and `features/*`: 817 files, ~45.7k lines, vendor and tests excluded.
- The host tooling in `tools/*`.

The audit was read-only. It follows up [tooling/2026-09-30-library-audit.md](tooling/2026-09-30-library-audit.md), whose ui-web items have mostly landed: `lightFormat`, remeda `funnel`/`sortBy`/`round`/`sumBy`/`findLast`/`mapValues`, and the reactuse event and interval hooks. The «Kept on purpose» list in `.claude/rules/shared/dependencies/reuse-libraries.md` was re-checked. Every reason in it still holds.

## Headline

The modpack is already library-first. No large hand-written subsystem is waiting for a package. The waste is **duplication between slices and features**: about 170 lines in ui-web, 150–200 lines in the game Python and 30–35 lines in the tooling. Consolidating it into existing shared modules (`shared/lib`, `core.format`, `core`, `tools/build/fileio`) removes those lines.

One new dependency is recommended: **ts-pattern** for ui-web. The repo rule already lists it, and it costs 2.7 KB gz. No new vendored Python library is worth its pyc weight.

## Gameface probe (candidate libraries)

Each library was probed with esbuild 0.28.2, `--bundle --minify --target=chrome94`, importing a typical set of its calls. The output was grepped for built-ins newer than Chrome 94 (`structuredClone`, `findLast`, `toSorted`/`toReversed`/`toSpliced`, `Object.groupBy`/`Map.groupBy`, `replaceAll`, `WeakRef`, `Promise.withResolvers`) and for `Intl`. **None** of the probed libraries uses any of these. `Object.hasOwn` (Chrome 93) and `Array#at` (Chrome 92) already ship in the current pages.

Current pages (gzip): `index.html` 169 KB, `hud.html` 112 KB, `viewer.html` 89 KB, `preset_advisor.js` 7.2 KB.

| Library | min | gzip | Needed? |
| --- | --- | --- | --- |
| ts-pattern 5.9.0 | 7.96 KB | 2.7 KB | **yes**: the rule lists it, and it gives exhaustive `match` for the discriminant ladders below |
| tiny-invariant 1.3.3 | 0.2 KB | 0.18 KB | no: there is one `throw`, in the dev bridge |
| dequal 2.0.3 (lite / full) | 0.49 / 1.07 KB | 0.32 / 0.51 KB | no: remeda `isDeepEqual` is already used in 5 places |
| @floating-ui/dom 1.8.0 | 14.1 KB | 5.7 KB | no: tooltips use the native engine bridge, and no popover positioning code exists |
| colord 2.10.0 | 5.8 KB | 2.0 KB | no: there is no colour maths in ui-web |
| culori 4.0.2 (`culori/fn`) | 3.75 KB | 1.5 KB | no, same reason |
| @tanstack/virtual-core 3.17.11 | 24 KB | 7.2 KB | no: the replay list is fixed-height (`visible-range` is 10 lines), and virtual-core leans on ResizeObserver, which is not confirmed in Cohtml |
| remeda 2.50.0 (10 common functions) | 4.4 KB | 1.8 KB | installed |
| date-fns 4.4.0 (`intervalToDuration` + `format`) | 22 KB | 6.5 KB | installed; `format` pulls in the locale, so keep `lightFormat` |

## 1. ui-web

Installed libraries in use:

- clsx: 97 files.
- zod/mini: 37.
- remeda: 32. Functions used: clamp ×14, sortBy, isDeepEqual, sumBy, round, isNonNullish, groupBy, indexBy, funnel, chunk, and others.
- reactuse: 17. Hooks used: useWindowEvent ×11, useInterval ×3, useEventListener, useDocumentEvent, useClickOutside, useBoolean, usePrevious.

Checked and clean, nothing to do:

- class joining: the `filter(Boolean).join(' ')` hits are text labels, not classes;
- `[...new Set]`;
- reduce-based grouping;
- store patterns: no hand-rolled subscribe sets outside the dev mock;
- colour maths;
- tooltip positioning;
- debounce: already remeda `funnel`;
- payload parsing: the hand-written walkers read engine proxies, not JSON, so zod does not fit.

| # | Finding | Files (examples) | Replacement | Est. lines removed | Risk / Gameface check | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| U1 | "Measure for N frames" `requestAnimationFrame` loop copied 4× | `shared/lib/use-fit-scale/use-fit-scale.ts:29-43`, `views/hud/model/hooks/use-panel-sizes/use-panel-sizes.ts:52-67`, `widgets/hud/hud-editor/model/hooks/use-stage-width/use-stage-width.ts:47-61`, `widgets/component/component-card/model/hooks/use-focus-line/use-focus-line.ts:17-34` | One `shared/lib/use-measure-frames` (~15 lines). reactuse `useMeasure` needs ResizeObserver, which is unverified in Cohtml, so it does not fit. | ~40 | low; use-focus-line skips the first synchronous measure | **do now** |
| U2 | `rem()` helper defined 6×, plus ~20 inline `{ width: rem, height: rem }` pairs | `shared/lib/icon-sprite/icon-sprite.ts:5`, `shared/lib/run-style/run-style.ts:7`, `entities/hud/crosshair/lib/shell-sprite/shell-sprite.ts:7`, `entities/hud/crosshair/ui/components/ReloadBox/ReloadBox.tsx:14`, `views/hit-viewer/lib/viewer-frame/viewer-frame.ts:27`, `widgets/window/window-frame/lib/frame/frame.ts:110` | `shared/lib/css-unit` with `rem(value)` and `remBox({ width, height })` | ~35 | low; keep frame.ts rounding as remeda `round(v, 2)` | **do now** |
| U3 | Formatting duplicated across slices: `percentText` ×2, percent without unit via `.replace(thinSpace + '%')` ×2, rising/falling/flat tri-state ×3, replay `formatCount`/`formatDuration` re-implementing format-number, SummaryStrip `toFixed + '%'` (dot instead of the comma used elsewhere), Roman tier table ×2 | `entities/hud/marks-panel/lib/marks-panel-view/marks-panel-view.ts:21,25,27,81`, `entities/hud/tank-card/lib/tank-card-view/tank-card-view.ts:39-53`, `widgets/component/component-card/lib/marks-report/marks-report.ts:13`, `entities/replay/replay/lib/format-replay/format-replay.ts:6-23`, `widgets/replay/replays-browser/ui/components/SummaryStrip/SummaryStrip.tsx:16`, `entities/hud/tank-card/config/tank-card.constants.ts:6` and `entities/replay/replay/config/replays.constants.ts:39` | Extend `shared/lib/format-number` (kept on purpose: no `Intl`) with `groupDigits`, `formatClock({ seconds, rounding })`, `formatPercent(..., { unit: false })`, `percentOrDash`, `romanTier`, `trendOf(delta)`. date-fns does not pay for mm:ss. | ~36 | low; SummaryStrip changes visibly (decimal comma) | **do now** |
| U4 | Gameface sub-view walking duplicated | `views/preset-advisor/lib/advisor-model/advisor-model.ts:5-24` vs `shared/api/gameface/scope/scope.ts:7` (`invoke`) and `shared/api/gameface/hangar-button/hangar-button.ts:17-29` (`subViewModels`) | Export `subViewModels` from `shared/api/gameface/scope`; the advisor uses `invoke` | ~18 | low | **do now** |
| U5 | SVG geometry duplicated: polar point ×2, circle path ×2, number-to-path-text ×4 | `entities/hud/crosshair/lib/reticle-arcs/reticle-arcs.ts:7-14`, `entities/hud/crosshair/lib/reticle-mark/reticle-mark.ts:7,11,27-31`, `shared/lib/sparkline/sparkline.ts:3,24`, `shared/lib/radial/radial.ts:7` | Move `polarPoint`, `circlePath`, `pathNumber` into `shared/lib/radial`; remeda `round`. d3-path is too big for this. | ~15 | low; sparkline rounds to 1 decimal, the others to 2 | later (with the next crosshair change) |
| U6 | Sprite background-position maths duplicated | `shared/lib/icon-sprite/icon-sprite.ts:18-29` vs `entities/hud/crosshair/lib/shell-sprite/shell-sprite.ts:14-24` | One `spriteCellStyle({ ... })` in shared/lib | ~10 | low | do now (with U2) |
| U7 | Imperative `document` binders wrapped in `useEffect` | `shared/lib/ui-sounds/ui-sounds.ts:51-57`, `shared/lib/find-key/find-key.ts:13-26`, `shared/lib/wheel-scroll/wheel-scroll.ts:86-94`, bound in `views/settings/model/hooks/use-app/use-app.ts:27,29` | reactuse `useDocumentEvent` (wheel with `{ passive: false }`). find-key's key-code logic stays (kept on purpose); only its binding changes. | ~20 | low–medium: confirm `passive: false` wheel blocking in the live client | later (needs a client check) |
| U8 | Discriminant if-ladders without exhaustiveness | `widgets/component/component-card/ui/components/ComponentEditor/components/EditorControl/EditorControl.tsx` (4 branches on field type), `entities/hud/crosshair/ui/components/DrumReadout/DrumReadout.tsx` (4), `entities/hud/crosshair/lib/reticle-mark/reticle-mark.ts:36-45` (3), `shared/api/gameface/dev-bridge/apply-message/apply-message.ts` (6, dev only) | **ts-pattern** `match(...).with(...).exhaustive()`: add `ts-pattern` to `apps/game/modpack/package.json` (catalog version) | ~0–10 (the gain is exhaustiveness: a new field type fails typecheck) | 2.7 KB gz, no banned built-ins (probe above); `index.html` +1.6 % | **do now**: add the dependency and convert EditorControl, DrumReadout and reticle-mark |
| U9 | Hand-rolled clamps | `entities/hud/crosshair/lib/reticle-arcs/reticle-arcs.ts:17`, `entities/hud/damage-log/lib/damage-log-view/damage-log-view.ts:13,23`, `shared/lib/wheel-scroll/wheel-scroll.ts:26`, `widgets/replay/replays-browser/lib/visible-range/visible-range.ts:6` (`views/hud/lib/input-area` is array min/max, not a clamp) | remeda `clamp` (already bundled) | 0 net (simpler) | none | do now (trivial) |
| U10 | Small copies: cubic `easeOut` ×2, `maxTop` vs scroll-metrics `scrollMaxOf`, `round2` in page-diag used only by window-frame, `isFiniteNumber` ×2, `use-viewport` `setTimeout(…, 0)` | `shared/lib/smooth-scroll/smooth-scroll.ts:5` + `shared/lib/use-tween/use-tween.ts:7`; `shared/lib/wheel-scroll/wheel-scroll.ts:14`; `shared/lib/page-diag/page-diag.ts:23`; `shared/lib/scroll-metrics/scroll-metrics.ts:3` + `shared/api/gameface/view-env/view-env.ts:25`; `widgets/window/window-frame/model/hooks/use-viewport/use-viewport.ts:36-40` | Shared exports; remeda `round`; reactuse `useTimeout` | ~10 | none | do now (with U1) |
| U11 | Virtual list | `widgets/replay/replays-browser/model/hooks/use-virtual-list` (34) + `lib/visible-range` (10) | @tanstack/virtual-core (7.2 KB gz) | — | ResizeObserver unverified, rem scale, wheel glide | **keep custom**; **drop `@tanstack/virtual-core` from the reuse rule's ui-web list** until a variable-height long list needs it |
| U12 | Timers in hooks that look replaceable | `views/hud/model/hooks/use-hovered-panel/use-hovered-panel.ts:31`, `features/window/undo-change/model/hooks/use-undo-toast/use-undo-toast.ts:30` | reactuse `useInterval` / `useTimeout` | — | `useInterval` has no `enabled`; the toast restarts on a key | keep custom |

`shared/lib` verdicts: every module stays. Those that donate code to the consolidations above are `format-number` (U3), `icon-sprite`/`run-style` (U2/U6), `radial`/`sparkline` (U5), `scroll-metrics`/`wheel-scroll`/`smooth-scroll`/`use-tween`/`page-diag` (U10), `use-fit-scale` (U1) and `ui-sounds`/`find-key` (U7). Already remeda-based and fine: `clamp-int`, `bar-fill`, `font-safe`. No library equivalent exists for `on-distinct` (reference-equality skip-repeat), `escape-stack`, `engine-shims` or `use-tooltip`.

**ui-web total: ~170 lines**, plus exhaustiveness from ts-pattern.

## 2. Python game code (`packages/*`, `features/*`)

Already centralised:

- `core.compat` over six: `to_text`, `is_number`, `as_int`.
- `core.format`: plural, number, percent, clock.
- `core.events`: blinker `OrderedSignal`.
- `core.settings.Schema`: coercion.
- `core.net.backoff`.

There are no manual memo, LRU or TTL caches, no `setdefault(..., []).append` grouping and no manual bisect loops. attrs is used by 23 classes.

| # | Finding | Files (examples) | Replacement | Est. lines removed | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Two `HitBook` classes share storage, ring buffer, pending-damage pairing, `finish`/`resize`/`clear`/`save`, `_keep_count` and `_near`; the client recorders duplicate too | `features/battle_results/model/hits/book.py:37-38,100-197` vs `features/hit_viewer/model/book.py:22-34,150-308` (58 matching lines); `battle_results/client/hits.py:55-73` vs `hit_viewer/client/recorder.py:121-164` | Base class in core (e.g. `core/hit_book`), since features cannot import each other; each feature keeps its entry builder | ~80–90 | medium: both have suites; the pending tuples differ in arity | **do now** |
| P2 | 8 hand-rolled listener lists in 6 core client modules; `moe` and `lobby_view` call listeners **unguarded**, so one failing listener stops the rest | `core/client/battle/teams/feed.py:29-43`, `core/client/lobby_view/__init__.py:33,67-71,100`, `core/client/me/__init__.py:119,178-183`, `core/client/moe/__init__.py:25,30,71`, `core/client/hud/gameface/__init__.py:189-191,248,271,461`, `core/client/hud/guiflash/__init__.py:55,101` | blinker (vendored) through `core.events.OrderedSignal`, or one `Listeners` helper that logs and continues | ~35–40, plus a bug fix | low | **do now** |
| P3 | Signed-number formatting ×6, percent-text wrappers ×3 | `features/battle_results/model/text.py:11-25`, `features/comp7_helper/model/battles.py:90-91`, `features/team_hp/model/__init__.py:40-41`, `features/marks_panel/model/page.py:21-32`, `features/session_stats/model/moe.py:75-76`, `packages/core/moe/macros.py:9-14` | `core.format.format_signed(value, percent=False)` and `format_percent(..., missing=)` | ~28 | low | **do now** |
| P4 | Copies inside one package (client vs model), per the duplicate detector | `core/client/native/defaults.py:10-23` vs `core/native_settings/__init__.py:14-30`; `features/replay_manager/client/__init__.py:26-38` vs `model/__init__.py:6-18`; `features/hangar_space/client/__init__.py:14-24` vs `model/__init__.py:5-27`; `features/crosshair/model/constants.py:22-39` vs `:49-65` | The client imports from the pure module | ~35 | low; read each pair first | do now |
| P5 | Hex-colour check duplicated: the same `HEX_COLOR` regex defined twice; `hex_color` vs `_color` | `core/hud/panel/constants.py:44` + `core/hud/widget/constants.py:41`; `core/hud/panel/__init__.py:154` vs `core/hud/widget/__init__.py:74` | One `HEX_COLOR` and one normaliser in `core/hud/panel`, imported by widget | ~6 | none | do now |
| P6 | Small copies: marks stars clamp ×2 in one feature; `depot_seller` rebuilds `count_phrase` by hand; `crosshair/model/readouts.py:23` `_seconds` re-implements the codec float parse | `features/marks_panel/model/card.py:77` + `model/widget.py:129`; `features/depot_seller/model/__init__.py:135`; `packages/core/codec/__init__.py:37-44` | One function in the marks model; `core.format.count_phrase`; `core.codec` | ~8 | none | do now |
| P7 | 24 inline `max(lo, min(hi, x))`, including the 0..1 fraction clamp ×7 and `max(1, min(int(keep), MAX_BATTLES))` ×2 | `core/hud/widget/__init__.py:71,93`, `core/hud/surface/__init__.py:86,93`, `core/settings/__init__.py:43`, `features/battle_results/model/hits/{book.py:44,figure.py:10}`, `features/crosshair/model/readouts.py:33`, `features/session_stats/model/goals.py:61`, `features/responsive_reticle/model/__init__.py:97` | `clamp(value, low, high)` and `fraction(value)` in `core.compat`; the stdlib has none, and no library is worth vendoring for it | ~10 (consistency) | low | later (the keep-count pair goes with P1) |
| P8 | Cross-feature client-glue pairs (detector output, unread) | `marks_panel/client/__init__.py:21-90` vs `platoon_points/client/__init__.py:36-101`; `gun_arc/client` vs `sixth_sense/client`; the `crew_xp`/`comp7_helper`/`personal_missions` hangar-card headers | Possibly a missing `BattlePanel` / hangar-card hook in core | ~15–30 | low–medium | later: read first |
| P9 | Shared constants copied between features (unread) | `marks_panel/settings/__init__.py:21-30` vs `team_hp/settings/__init__.py:11-20`; `marks_panel/model/constants.py:73-82` vs `session_stats/model/constants.py:108-117`; `comp7_helper/model/battles.py:18-25` vs `hit_viewer/model/result.py:7-14` | Core constants (tier/rating colour tables, battle-result keys) | ~25 | low | later |
| P10 | Classes that only copy their arguments in `__init__` | `companion/sender/__init__.py:22` IngestSender, `core/hud/edit/__init__.py:23` HudPreview, `features/replay_upload/model/upload.py:124` ReplayUploader, `companion/outbox/__init__.py:30` Outbox, `core/log/logfile.py:36` LogFile | `@attr.s(eq=False)` | ~20 | low–medium (attrs changes `__eq__`/`__hash__` unless `eq=False`) | later / optional: these are services with behaviour, so a plain `__init__` is fine |
| P11 | String constant groups (`ERROR_*`, `ACTION_*`, `COVER_*`) that look like enums | `features/replay_manager/model/constants.py:26-58`, `core/hud/layer/constants.py:12-21` | enum34 | 0 (adds `.value` at every boundary) | medium | **keep**: they are wire strings and i18n keys; enum34 is already used for internal results |
| P12 | Bounded history lists (`append` + `del x[:-n]`) at 14 sites | `features/damage_log/model/received.py:61`, `core/moe/pace.py:45`, … | `collections.deque(maxlen=n)` | ~0 | medium (JSON-serialised and sliced) | **keep** |

New vendored libraries, all checked against the code they would replace:

| Library (licence) | Pure .py size | What it would replace | Lines | Verdict |
| --- | --- | --- | --- | --- |
| cachetools 3.1.1 (MIT) | 22 KB | nothing: there are no manual caches | 0 | not worth vendoring |
| more-itertools 5.0.0 (MIT) | 189 KB | no chunked, windowed or partition loops | ~0 | no |
| toolz 0.10.0 / funcy 1.17 (BSD) | sdist only / 84 KB | clamp one-liners | <10 | no |
| boltons 20.2.1 (BSD) | 557 KB | listener helper and clamp are 10-line core helpers | <10 | no |
| python-dateutil 2.8.2 | 271 KB | `core/format/clock.py`, `core/replay_file/header.py:69` (one fixed format); does not fix the `%p` locale issue | ~5 | no |
| pathlib2 | — | `core/durable/paths.py` handles py2 bytes/text paths; no simpler with it | 0 | no |

**Python total: ~150–200 lines** (P1–P6 ≈ 195 at the upper estimates), plus the unguarded-listener fix.

## 3. Tooling (`tools/*`)

The right packages are already in use: watchdog (`dev/watch`), jsonschema (catalogue, hangar recipes, contract tests), Pillow (artwork, assets, previews), argparse (5 entry points) and `unittest` discovery.

| # | Finding | Files (examples) | Replacement | Est. lines removed | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | **Bug:** `json.dumps(indent=2)` on Py2 without `separators=(',', ': ')` leaves a trailing space after every comma, in the release `components.json`, `otmetki-dev.json` and the 10 checked-in widget fixtures (`card.sample.json` has 70 such lines) | `tools/build/fileio.py:48-50`, `tools/testing/_support.py:209-216`; correct already in `tools/build/hangars.py:160-161` (`json_text`) | Move `json_text` into fileio and use it everywhere; regenerate the fixtures with `OTMETKI_UPDATE_FIXTURES=1` | ~4 | low (generated bytes only) | **do now** |
| T2 | `attrs` (6 files) and `contextlib2` (2 tests) are imported directly but listed as transitive in `requirements.txt` | `tools/dev/{client,deploy,manager,selection}`, `tools/build/setupkit/manifest/generate.py`, `tools/build/model.py`; `tools/build/tests/test_build.py` | Move them to the direct list | 0 (accuracy) | none | **do now** |
| T3 | Duplicated file helpers: `read_json`/`load_json`/`load_raw` ×5 plus 4 inlined; whole-file `_read` ×3; mkdir+write ×2; vendor.py re-implements `make_dirs`/`write_text`/`sha256`; dev deploy copies via read-all | `tools/build/hangars.py:47-49`, `tools/testing/_support.py:142-144`, `tools/build/tests/test_changelog.py:31-33`, `tools/build/setupkit/manifest/tests/{test_dependencies.py:54,test_manifest.py:35}`, `tools/build/archive.py:74-76`, `tools/build/rasterize.py:50-52`, `tools/assets/lut.py:417-428`, `tools/assets/render.py:285-289`, `tools/vendor/vendor.py:116-139`, `tools/dev/deploy/__init__.py:127-128` | `fileio.read_json` / `read_bytes` / `write_bytes`; `shutil.copyfile` | ~30–35 | low | **do now** |
| T4 | `'--flag' in argv` CLIs: `hangars.py` documents `--check` but never parses it, and a typo such as `asset_sets.py --writ` silently runs a check | `tools/build/hangars.py:178`, `tools/build/asset_sets.py:226`, `tools/assets/render.py:293`, `tools/assets/lut.py:432`, `tools/build/client_index.py:125`, `tools/run_tests.py:75` | argparse (stdlib, already used). click 7.1.2 is not needed. | +15 net | very low | later / when touched |
| T5 | `assets.json` checked by hand (required keys, `origin` enum, `^res/` target, licence rules) | `tools/build/asset_sets.py:36-39,111-134` | `assets/assets.schema.json` + jsonschema 3.2, as `catalog.py` does | ~15 | low (message-text tests change) | later |
| T6 | Tests save and restore stdout, cwd, env and module attributes by hand | `tools/build/tests/test_build.py:189,193`, `tools/tests/test_client_smoke.py:729-735`, `tools/tests/test_ui_smoke.py:276-282`, plus 6 spots in game tests | `mock.patch.object` / `mock.patch.dict(os.environ)` (mock 3.0.5 installed) | ~20 | low | later / when touched |
| T7 | Deterministic zip, the DDS writer, polling python.log, urllib2 downloads, run_tests.py, os.path | `tools/build/archive.py`, `tools/assets/lut.py:354-401`, `tools/dev/pylog/__init__.py:454-475`, `tools/vendor/vendor.py:99-120`, `tools/run_tests.py` | — | — | — | **keep custom**: reproducible zips (fixed dates, stored, sorted); Pillow 6.2.2 cannot write DDS; change events on a file the client holds open are unreliable on Windows; no retry loop to replace; pytest 4.6 has the same basename collision; pathlib2 is unused and the game code shares the os.path style |

**Tooling total: ~35–40 lines** (T1 + T3), plus one output bug and the requirements accuracy fix.

## Do now, ordered by value

1. **T1**: fix the JSON separators in `fileio.write_json` and the widget fixtures. A real bug in release output; ~4 lines.
2. **P2**: route core client listeners through blinker (`OrderedSignal`) or one guarded `Listeners`. It fixes the unguarded notify in `core/client/moe` and `core/client/lobby_view`; −35–40 lines.
3. **P1**: core `HitBook` base for battle_results and hit_viewer, plus the recorder glue; −80–90 lines.
4. **U1 + U10**: `shared/lib/use-measure-frames` and the small shared exports (`easeOut`, `maxScroll`, `round`, `useTimeout`); −50 lines.
5. **U3 + P3**: formatting consolidation on both sides: `format-number` gains `groupDigits`/`formatClock`/unitless percent/`romanTier`/`trendOf`, and `core.format` gains `format_signed`/`missing=`; −36 and −28 lines.
6. **U2 + U6**: `shared/lib/css-unit` (`rem`, `remBox`) and one sprite-cell style; −45 lines.
7. **U8**: add **ts-pattern** to the modpack (catalog version, 2.7 KB gz) and convert EditorControl, DrumReadout and reticle-mark to `match().exhaustive()`. At the same time, **remove `@tanstack/virtual-core` from the ui-web list** in `.claude/rules/shared/dependencies/reuse-libraries.md` (U11).
8. **P4 + P5 + P6**: in-package client/model copies, one `HEX_COLOR`, the marks stars and `count_phrase` copies; −50 lines.
9. **T3 + T2**: fileio helpers across the tooling (−30–35 lines) and the direct `attrs`/`contextlib2` in requirements.
10. **U4 + U9**: shared Gameface `subViewModels` and remeda `clamp` at the 5 hand-written sites; −18 lines.

Later: U5, U7 (needs a live wheel check), P7–P10, T4–T6.

Keep custom: every «Kept on purpose» entry, the virtual list, enum-less wire constants, bounded lists, the deterministic zip, the DDS writer and the log polling.

**Expected total: ~370–420 lines removed** across the three areas, with one new runtime dependency (ts-pattern) and no new vendored Python library.
