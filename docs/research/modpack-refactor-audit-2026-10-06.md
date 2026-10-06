# Modpack refactor and performance audit — 2026-10-06

Scope: `apps/game/modpack`. That covers the game Python 2.7 (`packages/*`, `features/*`), the host tooling (`tools/*`) and `ui-web` (the React 19 Gameface pages). This audit was read-only and no code changed.

The «custom code vs libraries» question is covered separately in [modpack-library-audit-2026-10-06.md](modpack-library-audit-2026-10-06.md), which is still partial. This document does not repeat its items: clamps, `clsx` joins, `ts-pattern`, and py2.7 candidate libraries.

Each finding gives: area | files (`file:line`, relative to `apps/game/modpack/`) | problem | proposed refactor | value | effort | risk.

- **Effort:** XS < 1 h, S ≤ ½ day, M 1–3 days, L ≥ 1 week.
- **Value:** what the player or the developer gets.

## 1. Measurements

All figures were taken on the dev machine (Windows 11, Python 2.7.18 via mise, Node 24, Vite 8.3.1).

### 1.1 Python test suite (`tools/run_tests.py`, 4259 tests)

The suite takes **81.6 s** wall, timed per test folder with a custom `TestResult`.

| Folder | Time | Tests | Where the time goes |
| --- | --- | --- | --- |
| `tools/tests` | **51.7 s** | 233 | `test_client_smoke.py` takes **34.8 s** (180 tests, about 80 `StoryTest` classes). Almost all of it is spent in `setUpClass`, which boots the whole modpack per class. `test_ui_smoke.py` takes 11.1 s (29 tests, 0.2–1.0 s each). `test_py27_compat` takes 2.3 s. |
| `tools/build/setupkit/artwork/tests` | 9.7 s | 12 | `SvgArtworkTest.test_the_artwork_fills_the_canvas` alone takes **8.5 s**: one `node rasterize.mjs` process per SVG preview (31 of them). |
| `packages/core/tests` | 5.8 s | 1058 | `test_transport` `test_network_error` and `test_network_error_is_reported` take **2.0 s each**. They connect to `127.0.0.1:1`, which on Windows waits out the 2 s timeout. |
| `tools/build/tests` | 4.5 s | 80 | Real builds in temp dirs. |
| `tools/build/setupkit/manifest/tests` | 3.4 s | 44 | |
| All 43 feature folders together | ≈ 6 s | ≈ 2800 | Fast; the slowest is `hit_viewer` at 0.95 s. |

A cProfile of 5 smoke stories (6.7 s) shows where one modpack boot goes:
- `_io.open`: 2.19 s tottime, 2093 calls.
- `json` encoding: 0.56 s.
- `storage._move_over` (`MoveFileExW` write-through): 0.28 s.

Each boot calls `ComponentConfig.section → save` about 9 times. That is about 20 `MirroredFile.write` calls, each about 4 real writes plus 4 stamp reads (see P3). The tests boot from a fresh config, so they hit the first-run path every time. The same path runs in the client on the first start after an update.

The suite also prints **361 `[OTMETKI]` log lines** to stdout, tracebacks included. The tests pass, but this noise hides real failures.

### 1.2 ui-web

| Item | Value |
| --- | --- |
| `vitest run` (modpack-ui, 159 files, 1475 tests) | 19.1 s. Vitest's own breakdown: import 38 %, environment 32 %, transform 21 %, **tests 7 %** |
| `vite build`, run directly (`node_modules/.bin/vite`) | index 2.0 s, hud ≈ 0.9 s, viewer 0.9 s; the whole `ui:build` takes about 5 s. Through `npx` each run costs about 6 s more (bun's npx resolution), so docs should say `bun run ui:build`, never `npx vite`. |
| Shipped `packages/ui/gameface` | `index.html` 598 KB (169 KB gz), `hud.html` 380 KB (113 KB gz), `viewer.html` 292 KB (89 KB gz), **`icons.png` 395 KB**, `shells.png` 12 KB, `preset_advisor.js` 20 KB |

Bundle composition comes from a sourcemap build into the scratchpad. Bytes are attributed per source from the mappings.

| Page | react-dom | zod (mini) | Own code (largest slices) | CSS |
| --- | --- | --- | --- | --- |
| hud (342 KB JS) | **202 KB (61 %)** | 18.7 KB | `entities/hud` 54 KB, `views/hud` 12 KB, `shared/lib` 8 KB, `shared/api` 7 KB, `ui-kit/hud` 7 KB | 37.5 KB (6 KB gz) |
| index (489 KB JS) | **202 KB (42 %)** | 25 KB | `entities/hud` 54 KB, `widgets/component` 37 KB, `widgets/replay` 31 KB, `shared/lib` 17 KB, `widgets/window` 11 KB | 105 KB (15 KB gz) |
| viewer (275 KB JS) | **202 KB (75 %)** | 18.6 KB | `views/hit-viewer` 14.5 KB | 17 KB |

- **Tree-shaking works.** `hud.html` holds no settings-window CSS, strings or schemas, and every import uses `zod/mini`.
- **react-dom dominates every page.** Each page pays the same 202 KB to parse and compile. The HUD page does this at every battle load, and again whenever the window is reopened (see R2).

### 1.3 Build and packaging

| Item | Value |
| --- | --- |
| `build.py` (split dev build, 44 packages) | 3 s |
| `setupkit` catalogue (44 previews) | **10 s**; same cause as the 8.5 s test: one Node process per SVG |
| `ruff check .` | 40 ms |
| Largest `.mtmod` files | `hit_viewer` **7.1 MB**: five shell `.dds` textures are 6.3 MB of it (`shell_AM.dds` alone is 2.8 MB), stored uncompressed as `.mtmod` requires. `ui` 1.85 MB: the 4 pages plus `icons.png`. `core` 0.9 MB: `vendor/attr` 152 KB of `.pyc`. |
| Vendored import cost (py2.7) | `attr` 20 ms, `six` 1 ms, `blinker` < 1 ms |

### 1.4 Game-thread load

- **12 `Ticker` sites and 17 raw `BigWorld.callback` sites** (full table in Appendix A).
- **Every frame:** `responsive_reticle` (`FRAME_S = 0.001`), and `gun_arc` when `fast_redraw` is on.
- **20 Hz:** `gun_arc`.
- **10 Hz:** the crosshair readouts during a reload.
- **About 12 hook families** fire per frame or per input event: the gun-marker update, `handleMouseEvent` and `handleKeyEvent`, `onVehicleStateUpdated` (6 handlers), and `showDamageFromShot` (3 stacked wrappers).
- **HUD push cost, measured in py2.7:** for a 12-panel state of 11.6 KB, `canonical_json` (`sort_keys=True, ensure_ascii=True`) takes **1.43 ms** per push. The same dict without `sort_keys` takes 0.52 ms.
  - The default worst case is about 20–30 full-state pushes per second, which costs 30–45 ms of game-thread time per second.
  - With `gun_arc.fast_redraw` it is one push every frame: 1.4 ms out of the 6.9 ms frame budget at 144 FPS.

## 2. Performance — game Python (game thread)

| # | Area | Files | Problem | Proposed refactor | Value | Effort | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | HUD push protocol | `packages/core/hud/surface/__init__.py:255-285`, `surface/push.py:18-30`, `packages/core/client/hud/gameface/__init__.py:285-295`, `core/hud/layer/__init__.py:198` | Every change rebuilds a dict per panel and re-dumps the **whole** state with sorted keys and ASCII escaping. `ensure_ascii` turns Cyrillic into `\uXXXX`, about 6 bytes per character. That state includes the translated `hint` of every panel and all damage-log rows. `FramePush` coalesces to one push per frame and drops identical text, but still pays the full encode first. The page then parses everything again (U1). | **Step 1 (S):** cache each panel's encoded JSON fragment, invalidated in `HudSurface.create/update/delete` (bump a per-alias version only when the props actually differ), and join the cached fragments. Drop `sort_keys` and use `ensure_ascii=False` for this channel only; it needs no canonical form. **Step 2 (M–L):** a patch protocol `{rev, set:{alias:panel}, del:[...]}`, as `packages/ui/feeds/feed.py:41-64` already does for the settings window. Send `hint` once per page load instead of in every state. | Encode cost goes from about 1.4 ms to about 0.1–0.2 ms per push (only the changed panel is encoded). Less JS parsing too. | S + M | Med (Step 2 changes the HUD protocol on both sides; bump `HUD_PROTOCOL_VERSION`) |
| P2 | Per-frame reticle | `features/responsive_reticle/client/__init__.py:120,177-214`, `model/constants.py:18` | `FRAME_S=0.001` runs the stock `VehicleGunRotator.__rotate` and `__updateGunMarker` every frame, where the client itself runs them at 10 Hz. It also calls `enabled()`, `settings.get('follow')` and `handler.getAimingMode` (no `getattr` guard, `:73-77`) every frame. | Cache `enabled`/`follow` on `settings_changed` and `battle_ready`, and bind `getAimingMode` once. Add a frame cap option (for example `FRAME_S ≈ 1/60`). Profile `__rotate` in the client before and after. | The largest single per-frame Python cost. Its size is not measured yet, so profile it in game. | S | Low |
| P3 | Durable writes | `core/storage/__init__.py:13-57`, `storage/constants.py:5`, `core/durable/__init__.py:87-90`, `durable/stamps.py:16-31`, `core/hud/config/__init__.py:19-58`, `core/hud/modes/__init__.py:132`, `ui-web/src/features/hud/edit-panels/model/hooks/use-wheel-resize/use-wheel-resize.ts:22-24` | Each save of components.json, config.json or state.json costs: 2 `.tmp` writes and 2 `MoveFileExW(…WRITE_THROUGH)` calls, 2 read+rewrite cycles of `saved_at.json`, 2 `utime` calls and an `isdir`. Nothing is debounced. The page sends `resized` on **every wheel notch, in battle too**. At startup `section()` saves the whole file once per section that differs (about 30 sections on the first run after an update). | Add a dirty flag plus one deferred save (`BigWorld.callback(1.0)`, flushed on `battle_leave`, hangar entry and `fini`) in `ComponentConfig`, `ModePlaces` and `app.save_state`. Keep the stamps in memory per `Stamps` object and read them only in `sync()`. Keep `WRITE_THROUGH` only for `SECRET_FILES`. At boot, save `components.json` once after all sections register. | Removes disk stalls during HUD edit in battle and at first boot. The Python suite gets about 25 % faster (see T1). | S–M | Low–Med (a crash loses at most about 1 s of edits; test that the flush runs on exit) |
| P4 | `gun_arc` tick | `features/gun_arc/client/__init__.py:32-49,96-118`, `core/client/game/__init__.py:27-32` | The tick runs at 20 Hz, or every frame with `fast_redraw`. Each one: `import Math` inside the function, `client_attr` through `importlib` (only a `sys.modules` hit, but every tick), 3 projections, a new widget dict, a `resolve()` deep copy, `stock.want()` frozensets, `show`, `sync_stock` and `place`. When the arc goes off-canvas it calls `hide()`, which deletes the label (see R2). | Resolve `getViewProjectionMatrix` and `Math` once at `start`. Skip the render when the reticle, the hull yaw and the marker point are unchanged within an epsilon (reuse `responsive_reticle`'s `Stillness`). Keep the label off-canvas as `visible:false` instead of `hide()`. | Fewer pushes: about 20/s down to near 0 while the tank and camera are still. | S | Low |
| P5 | `BattlePanel.show` overhead | `core/client/hud/panel/__init__.py:124-132`, `core/hud/backend/__init__.py:74-92`, `gameface/__init__.py:63-73,222-223,232-239` | Each `show()` makes 3–4 `layout_id()` calls (an `openwg_gameface.res_id_by_key` call inside a try). It also runs `sync_stock()`, `renders_widgets()` and `drawn_aliases()` even when nothing changed. | Cache `layout_id()` once it returns a valid id. Run `sync_stock()` only when `hud.show` created, changed or deleted something, or when `drawn` changed. | Every panel update gets cheaper. | S | Low |
| P6 | Hooks of disabled features | `features/free_camera/client/__init__.py:51-52`, `features/crosshair/client/__init__.py:123-135`, `features/responsive_reticle/client/__init__.py:136-142`, `core/hooks/__init__.py:99-108` | Overrides installed at init run on every mouse or key event (free_camera, in battle too) and every gun-marker update (crosshair, twice with dual accuracy). Each call allocates an `OriginalCall`, even with the feature off. | Install `free_camera` only while a flight is active (or only in the hangar and replays). Install the crosshair circle override only when its switch is on and the circle is scaled. Install `responsive_reticle`'s overrides on `battle_ready` and restore them on `battle_leave`. Optionally give `OriginalCall` `__slots__`. | Less per-frame and per-event overhead for most players. | S–M | Med (install and restore order relative to other mods) |
| P7 | Logging on the game thread | `core/log/__init__.py:23-47`, `core/log/logfile.py` | Every `log()` prints, then opens, appends to and closes `otmetki.log`. `log_exception` builds `traceback.format_exc()` **before** the repeat limiter, so a handler that fails every frame formats a traceback every frame. `Ticker` never gives up on a failing tick. `_set_drawn` logs on every lamp blink and every `gun_arc` create or delete. | Check the limiter first: key on context + exception type + last frame from `sys.exc_info()`, and format the traceback only when the line will be written. Keep the log file handle open, or buffer and flush at 1 Hz. Stop a `Ticker` after N failures in a row, with one log line. Make `_set_drawn` a debug line, or log it once per battle. | Fewer frame-time spikes when something breaks. | S | Low |
| P8 | HP and feed renders | `core/client/battle/teams/__init__.py:41-65`, `features/team_hp`, `battle_progress`, `platoon_points/client/__init__.py:74-79` | Each damage event re-renders team_hp, battle_progress and platoon_points twice: once from the feed and once from `onVehicleFeedbackReceived`/`updateVehicleHealth`. `platoon_points._on_arena_entry` rescans all vehicles on every `onVehicleUpdated` (about 30 × 30 at load). | Coalesce: mark dirty and render on the next frame (`BigWorld.callback(0)`), as `FramePush` does. Add only the changed vehicle in `platoon_points`. | Fewer renders in busy fights. | S | Low |
| P9 | Writes inside a battle | `packages/companion/battles/client/__init__.py:141-199`, `companion/outbox/__init__.py:42`, `features/battle_results/client/__init__.py:155`, `features/hit_viewer/client/recorder.py:119-123`, `battle_results/client/hits.py:57-60` | Results that arrive in battle trigger several `save_state()` calls and an outbox write. The hit books (large shot-segment JSON) are written synchronously on avatar leave. | Queue results while `app.in_battle` and process them on `hangar`. Make `save_state` coalesce (dirty + one callback). Write the hit books on hangar entry. | No disk stalls during a battle or at its end. | S–M | Low |
| P10 | Replay index | `features/replay_manager/client/__init__.py:139-160`, `model/library.py:23-42`, `model/constants.py:23` | The 40 ms index budget per 1 Hz tick is a visible hitch every second while the window wants it. `_newest_files` stats every replay before trimming to 1000. | Lower the budget to about 8 ms and run it every frame while the window is open (same throughput, no hitch). Use `os.listdir` + name sort (replay names hold a timestamp) before the stat. | Smoother hangar while browsing replays. | S | Low |

## 3. Performance — HUD page (Gameface)

| # | Area | Files (`ui-web/src/`) | Problem | Proposed refactor | Value | Effort | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U1 | State intake | `views/hud/model/hooks/use-hud-state/use-hud-state.ts:19-33`, `shared/api/hud-protocol/hud-protocol.ts:7-19`, `views/hud/lib/share-panels/share-panels.ts:7-26` | The HUD does not use nanostores. Every push runs a full `JSON.parse`, a full zod `safeParse` and an `isDeepEqual` per panel, then goes into one `useState`. The cost grows with the whole state, not with the change. | Do this together with P1 step 2: apply patches into a nanostores `map` keyed by panel id, with one `useStore($panels, {keys:[id]})` per label. Validate only the panels that changed. | Parse and validation work drops to the changed panel only. | M (with P1) | Med |
| U2 | Re-render fan-out | `views/hud/ui/HudOverlay.tsx:11-13`, `views/hud/ui/components/HudLabel/HudLabel.tsx:12`, `views/hud/model/hooks/use-hud-overlay/use-hud-overlay.ts:37-53` | There is no `React.memo` anywhere. `labelOf` creates a new object, `onClick` and style per label on every render. `layoutLabels` (the dock/obstacle solve) is not memoised. Every push, hover poll (50 ms) and drag `mousemove` re-renders every `HudLabel` and every text subtree. Unchanged widgets are skipped only because their cached element is reused. | `React.memo(HudLabel)` and `HudLines`, a stable `onClick(id)`, `labelOf` memoised per id, `useMemo(layoutLabels)` on its inputs. | Only the changed label renders. | S–M | Low |
| U3 | Measure loop | `views/hud/model/hooks/use-panel-sizes/use-panel-sizes.ts:32-68` | The layout effect depends on `[lines, widgets, sizes]` and reads `offsetWidth`/`offsetHeight` of all labels at once and then for 4 rAF frames: at least 5 forced layouts per push. Any size change re-runs the whole loop, because `sizes` is in the deps. | Drop `sizes` from the deps and measure only the labels whose content changed. Extract one `useSettleMeasure(frames)` to replace the 4 copies (`use-fit-scale.ts:76-90` loops after every render because it has no deps; also `use-stage-width.ts:54-58` and `use-focus-line.ts:29-32`). | Removes most forced layouts in Gameface. | M | Med (the loop exists because Gameface lays out late, so test in the client) |
| U4 | Text shadow on every glyph | `views/hud/ui/components/HudLabel/HudLabel.module.scss:17` (`@include hud-text`), `packages/design-tokens/scss/_hud.scss:49` (`0 0 2px …, 1px 1px 1px …`). The same mixin is used in `ui-kit/hud/HudPlate`, `HudTip`, `DamageLogWidget`, `ZoomReadout`, `SixthSenseWidget`. `entities/hud/crosshair/ui/components/ReloadBox/ReloadBox.module.scss:16-21` has 5 layers with a 3px blur. | `text-shadow` inherits, so every HUD glyph gets a two-layer blurred shadow. The crosshair readout, which updates at 10 Hz, gets a 5-layer one. | Use one zero-blur layer (`1px 1px 0`) or Gameface's text stroke, and only on text leaves. Cut `ReloadBox` down to 1–2 layers. | Cheaper GPU work for every HUD frame. | S | Low–Med (readability must be checked by eye in game) |
| U5 | Layout-triggering transitions and filters | `TeamBar.module.scss:41`, `TankScale.module.scss:28,47`, `ThresholdScale.module.scss:27,49`, `MarksBar.module.scss:19`, `ShellSlot.module.scss:50`, `TeamStrip.module.scss:21` (`filter: grayscale` on up to 30 icons), `SixthSenseWidget.module.scss:31` (`infinite` pulse that also overrides the inline `opacity`, `.tsx:20`) | `width`/`left`/`height` transitions force layout on every frame. Filters are expensive in Gameface. | Switch to `transform: scaleX/translateX`. Use a pre-greyed sprite row or a dimmed tone for dead vehicles. Make the lamp pulse finite and fix the opacity conflict. | Smoother bars, less GPU work. | S | Low |
| U6 | Damage-log gradients | `DamageLogRow.module.scss:50-87`, `DamageLogTotals.module.scss:32-52`, `DamageLogWidget.module.scss:11` | 8 + 5 copy-pasted tone gradients, plus a 1.2 s gradient flash per row. | One class driven by a `--tone` custom property (check Gameface support) or a mixin. Consider solid alpha fills. | Less CSS, fewer gradient layers. | S | Low |
| U7 | React runtime size | all pages (§1.2) | react-dom is 202 KB per page (61 % of the HUD, 75 % of the viewer). Gameface parses and compiles it at every HUD window load. | **Experiment:** alias `react`/`react-dom` to `preact/compat` for `hud` and `viewer` only, first in one branch. nanostores/react uses `useSyncExternalStore`, and both it and react-error-boundary run on preact/compat. Measure page-ready time in the client. | About −190 KB raw (about −55 KB gz) per page, faster HUD window start. | M | Med–High (React 19 behaviour differences and Gameface quirks; keep it only if the in-game timing proves it) |
| U8 | Timers | `views/hud/model/hooks/use-hovered-panel/use-hovered-panel.ts:31` (50 ms poll), `use-input-area.ts:34-40` (effect with no deps, plus a 1 s interval), `features/hud/edit-panels/model/hooks/use-panel-drag/use-panel-drag.ts:83` (window `mousemove` always attached), `shared/lib/use-tween/use-tween.ts:21-44` (a wasted rAF on mount) | Polling and listeners that run even when idle. | Poll hover only while the cursor is shown, at about 100 ms or driven by events. Attach `mousemove` only while dragging. Give `use-input-area` deps. Skip the tween on mount. | Less idle CPU on the page. | S | Low |
| U9 | `icons.png` | `ui-web/config/vite/icon-sprite`, shipped as `packages/ui/gameface/icons.png` (395 KB) | The largest single asset in the ui package. | Quantise the sprite at build time (pngquant/oxipng through `@resvg` output, or `sharp` if it is already in the tree). Check that every glyph row is used. | Typically 50–70 % smaller. Download size only. | S | Low |

## 4. Architecture and refactors

| # | Area | Files | Problem | Proposed refactor | Value | Effort | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Two HitBook implementations | `features/battle_results/model/hits/book.py` (223 lines) vs `features/hit_viewer/model/book.py` (308 lines), constants in `battle_results/model/hits/constants.py:6-23` and `hit_viewer/model/constants.py:7-42` | The same store, keep and pending-damage logic. Identical `_near`, `_keep_count`, `_is_battle_id`, `_stored_battles`, `resize`, `clear`, `save` and `finish`. Copied constants: `OUTCOME_BY_CODE`, `OUTCOMES`, `DAMAGING`, `PART_NAMES`, `DAMAGE_WINDOW_S`, `MAX_BATTLES`, `BOOK_VERSION`. | A `core/hit_book/` package with a `BattleBook(store, keep)` base class and the shared constants. Each feature subclasses `start`, `hit` and `clean_hit`. Keep the stored formats byte-compatible and pin them with fixture tests. | About −100 lines, and a fix lands in one place | M | Med |
| A2 | Core number and text helpers | `core/compat/__init__.py:34-39` (`is_number`/`is_int` already reject bool). The redundant `and not isinstance(v, bool)` appears at 17 sites, e.g. `core/hud/widget/__init__.py:50`, `core/hud/surface/__init__.py:80`, `core/hud/modes/__init__.py:57,87`, `features/aim_info/model/__init__.py:13`, `crew_xp/model/__init__.py:14`. Local `_int`/`_number`/`_text` helpers live in `event_trackers/model/triathlon.py:21`, `comp7_helper/model/__init__.py:15`, `marks_panel/model/report.py:68`, both hit books, `update_notice/model/__init__.py:66`, `battle_loadout/model/__init__.py:17` and others. | Dead conditions, and about 15 copies of `core/me/parse.py:7` `number()`/`count()` and of "`to_text().strip()[:n] or None`". | Move `as_number(v, low, high)`, `as_count(v)` and `clean_text(v, limit)` into `core.compat`. Delete the redundant bool checks. | About −70 lines | S | Very low |
| A3 | `PanelSpec` boilerplate | `features/{team_hp:17, gun_arc:54, sixth_sense:41, platoon_points:36, damage_log:75, battle_progress:38, battle_loadout:17, battle_hotkeys:15, crosshair:50, marks_panel:21}/client/__init__.py`, `battle_results/client/last_battle.py:15` | The same 9-line `PanelSpec(...)` appears 11 times, plus imports. | `PanelSpec.of(settings, strings, preview, size)` in `core/client/hud/panel/__init__.py:13`, reading `PANEL_ID`, `SCHEMA`, `SWITCH`, `preview_text` and `preview_widget` by convention. | About −80 lines; a new panel is less code | S | Low |
| A4 | Trivial editor modules | `features/{aim_info, battle_loadout, battle_progress, gun_arc, platoon_points, team_hp}/model/editor.py` (about 10 lines each), `features/crosshair/model/editor.py:26-34` | Six one-call files, and the crosshair re-implements `core/editor/__init__.py:18-26` by hand. | Fall back to `editor_spec(id, model.constants.EDITOR_GROUPS, translate)` in `packages/ui/components/catalog.py:33-34` and delete the six files. Make the crosshair call `editor_spec(..., icons=, swatches=)`. | About −63 lines | S | Low |
| A5 | Constants copied from core | `TIER_COLORS` (`marks_panel/model/constants.py:73` = `session_stats/model/constants.py:108`). `CLASS_GLYPHS` (`damage_log/model/constants.py:38` = `core/hud/icons/constants.py:17`). `CLASS_TAGS`/`NATION_NAMES` (`marks_panel/model/constants.py:115,131`). `RESULT_TONES` ×3. `ACTION_REFRESH` ×4. `FIXED={'font_size':14}` ×5. `HIDDEN_LAYERS` ×2. `ALIGN_X/Y`. `LOCAL_HOSTS` ×2. `u' · '` ×7. | Copy-paste drift. | Import from `core/format/constants` and `core/hud/icons`. Give `PolledHangarCard` a default `FIXED`. | About −75 lines | S | Low |
| A6 | Own damage feed and dead `DamageTracker` | `core/client/battle/damage/__init__.py:12` (unused, 41 lines; its docstring wrongly says the main-calibre counter uses it). The same `_on_feedback`/`_add_event` code is in `marks_panel/client/__init__.py:80-104`, `platoon_points/client/__init__.py:91-110`, `battle_progress/client/__init__.py:99-124` and `damage_log/client/__init__.py:117,204`. | Dead code, and four copies of the own-feed logic. | Rebuild `DamageTracker` as `OwnFeed(kinds, on_change)` over `battle_tally.Counters` and use it in all four features, or delete it. Re-export the guarded client enums (`FEEDBACK_EVENT_ID`, `VEHICLE_VIEW_STATE`, `BATTLE_EVENT_TYPE`, `BattleFeedbackCommon`) from `core.client.battle`. Today 7 feature files import `BattleFeedbackCommon` unguarded, while core guards the same import. | About −65 lines; one guarded import path | M | Med |
| A7 | Bypassed core helpers | Direct `helpers.dependency` calls in `core/client/hud/cover/windows.py:43`, `core/client/hud/space/__init__.py:40`, `core/client/lobby_view/__init__.py:47`, `ui/client/window/input.py:6`, `features/hit_viewer/client/window.py:45`, `replay_manager/client/playback.py:88`. Duplicate `lobby_app()` (`hit_viewer/client/window.py:43` = `ui/client/window/input.py:4`) and `hangar_space()` (`hit_viewer/client/stage.py:27` = `hangar_space/client/space.py:22`). `cover/windows.py:43` and `lobby_view:47` both subscribe to `onWindowStatusChanged`. | Core's `service()` helper (used in 26 places) is bypassed in 7. | Use `service()`. Move `lobby_app` and `hangar_space` into `core.client.game`. Share one window-status watcher. | About −30 lines | S | Low |
| A8 | ModsSettingsAPI view | `companion/settings_ui/client/__init__.py:15-18,47-102`, `companion/settings_ui/__init__.py:7-36` | A fallback view for a library that CLAUDE.md says not to depend on. It is not in the catalogue, and its docstring is stale. | Remove it, along with its strings and tests. | About −85 lines | S | Low–Med |
| A9 | Config migrations | `companion/config/migrate.py` (247 lines), `companion/config/constants.py:93-311` (migration tables), `RETIRED_PLACES` in 10 feature settings, `core/hud/panel/__init__.py:103` `retired_reset`, `hangar_tweaks/model/constants.py:13`, `companion/tests/test_config_migrate.py` (532 lines) | Revisions 1–8 were written within one week (2026-09-30 to 2026-10-06). This is needed only for installs older than the latest public modpack builds (0.3.x). | Product decision. Freeze a "minimum supported revision" equal to the oldest build still in the published index, and drop the steps older than it on each release. If no public build predates revision 8, keep only the `defaults_revision` stamp. | About −520 lines + 530 test lines | M | Med |
| A10 | GUIFlash renderer | `core/client/hud/__init__.py:21,24` (`BACKENDS`), `core/client/hud/guiflash/` (119 lines), `core/hud/backend` (124 lines). Every panel's text half: `damage_log/model/text.py` 121, `session_stats/model/text.py` 100, plus 11 `preview_text` functions and `core/format/markup.py`. | Gameface is required by 23 packages and GUIFlash by 20 of the same ones, so GUIFlash only renders when the Gameface window fails. Every panel maintains two renderings. | Product decision, made from the "HUD renderers" line in real `python.log` files. If Gameface is always there, drop the backend chain first (about −250 lines), then the text paths (about −500 more). | Up to −700 lines; one rendering path to test | L | High |
| A11 | Oversized modules | `core/client/hud/gameface/__init__.py` (553 lines), `core/hud/layer/__init__.py` (403), `companion/config/constants.py` (393; mostly the A9 tables), `features/session_stats/client/__init__.py` (362), `replay_manager/client/__init__.py` (341), `hit_viewer/client/stage.py` (307), `ui/bridge/bridge.py` (303, 24 `_on_*` handlers). Functions are fine: ruff caps them, and only `core/client/hud/stock/__init__.py:67 install` is over 40 lines (41). | Hard to navigate. `gameface` mixes window lifecycle, focus, cursor and the message router. | Split `gameface` into `focus.py`, `cursor.py` and `messages.py`. Split the bridge handlers by area (profile, hud, window). Move the session_stats reads into `client/reads.py`, as the other features do. Move `SceneModels` out of `stage.py`. | Readability | M | Low |
| A12 | Soft core cycle | `core/client/component/__init__.py:13` ↔ `core/client/hud/panel/__init__.py:7` | Package-level cycle, held up only by the import order. | Move `component_config` and `hud_layer` into a leaf `core/client/hud/state.py`. | Removes a fragile import order | XS | Low |
| A13 | Naming | Component id: `PANEL_ID` vs `SECTION` (29 features) vs `FEATURE_ID`; `aim_info` uses three names for one id, plus a literal `FEATURE='aim_info'` in its editor. Classes: `TeamHpPanel` vs `SixthSenseAlert`/`CrosshairComponent`. Builders: `team_hp_widget` vs `panel_widget`/`points_widget`, and `format_panel` vs `format_sixth_sense`/`points_text`. i18n: `strings.py` + re-export (21 features) vs inline `STRINGS` (19). | Inconsistent conventions. | Use one `COMPONENT_ID` (never a literal), `<Id>Panel`/`<Id>Card`, `<id>_widget`, `format_<id>`, and one i18n layout (inline removes 21 files). Enforce it in `tools/tests/test_layout.py`. | Easier to read across features | M (churn) | Low |
| A14 | Dead Python code | `features/hangar_space/model/previews.py:86 is_armed`, `features/marks_panel/model/constants.py:69 PERCENT_SUFFIX`. Test-only code shipped to players: `core/net/signing/__init__.py:73 verify_request` (the server-side verifier), `core/storage/__init__.py:64 MemoryFile` (a test double), `HudLayer.backend_name`, `TeamHp.is_ally`, `Watchdog.is_waiting`, `ui/components/constants.py:71 CONTEXTS`. Also the `responsive_reticle` realm branch (`model/constants.py:3-12`, `model/__init__.py:30-44`, `client/__init__.py:112,133`), which maps both realms to the same signature. | Unused, or test-only code in the client. | Delete them. Move `MemoryFile` and `verify_request` into `tools/testing/_support.py`. Collapse the realm branch. | About −90 lines | XS | Very low |
| A15 | ui-web duplication | `entities/hud/tank-card/ui/components/TankScale` = `ui-kit/hud/ThresholdScale`. 5 bar implementations (`MarksBar`, `TeamBar`, `DamageLogBar`, `ui-kit/hud/MiniBar`, `CardRowProgress`). `${x}rem` style builders repeated in 9 files. 5 widgets skip `HudPlate`. | Duplicated visuals mean optimisations (U5) have to land several times. | Merge them into `ThresholdScale` and a single `MiniBar` built on `shared/lib/bar-fill`, plus one `rem()`/`percent()` helper. | Less code, one place to optimise | M | Low–Med (visual parity) |
| A16 | ui-web test-only exports | Unused in production: `entities/hud/crosshair/lib/reticle-mark/reticle-mark.ts:97 reticleMarkSource`, `features/hud/widget-registry/lib/widget-registry/widget-registry.ts:34 widgetKinds`, `shared/lib/format-number/format-number.ts:53 formatReload`. About 15 more are exported only for tests (`hitPanel`, `matchesReplay`, `tweenAt`, `labelStyle`…). `entities/hud/panel-layout/lib/panel-geometry/panel-geometry.ts:3,5` depends on the settings protocol types. | knip passes because tests import these exports. | Delete the three dead ones. Leave the test-only exports as they are; they are cheap. Give `panel-layout` a HUD-local panel type. | Hygiene | XS | Very low |

No FSD layer violations, cross-slice imports or deep imports were found in `ui-web`. No pure `model/` code imports the client, no feature imports another feature, and core imports neither the companion nor the features.

## 5. Reliability

| # | Area | Files | Problem | Proposed refactor | Value | Effort | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Bus events blocked by an earlier failure | `packages/companion/app/client/__init__.py:257-272` (`battles.on_battle_ready`/`on_battle_leave` run **before** `bus.emit`), `:224-235` (`_switch_account` → `save_state` before `hangar`), `:205-216` (`sender.tick` before `tick`) | The outer guard logs the exception, but the emit never happens. A failing `on_battle_leave` therefore means no `battle_leave`: the per-frame `responsive_reticle` ticker and the 20 Hz `gun_arc` ticker keep running in the hangar, and the battle hooks stay attached. A failing `sender.tick` freezes the hangar cards. | Wrap each capture step in its own `try/log_exception` (or emit first). As a safety net, make the battle tickers return False when `not app.in_battle`. | Prevents a whole class of "stuck in hangar" bugs. | XS–S | Very low |
| R2 | HUD window close/reopen | `core/client/hud/gameface/__init__.py:260-261,298-301`, `core/hud/layer/__init__.py:312-323` | `delete()` → `sync()` closes the window when the space has no labels. The next `create` builds a new `HudWindow` and reloads the whole 380 KB page. In a battle where only transient panels are up (the sixth-sense lamp, a hotkey notice, the last-battle card, `gun_arc` off-canvas), a streamer mute or a free-camera GUI hide, every lamp blink can destroy and recreate the view. `answered` (`:440`) is never reset, so `renders_widgets()` is True before the new page has loaded. | Keep the window for the whole GUI space and close it only in `_on_space_left`, or after a short delay checked against a generation counter. Reset `answered` in `open()`/`close()`. | Removes repeated page loads (the JS parse cost of U7) and a source of flicker. | S | Low–Med |
| R3 | Sticky `broken` backend | `core/hud/backend/__init__.py:90-92`, `gameface/__init__.py` | After Gameface is marked `broken`, labels it already owns keep routing to it through `BackendChain.owners`. They never fall back to GUIFlash until they are recreated. | On `broken`, move the owned aliases to the next backend (re-create them there). | Correct fallback (only matters while A10 keeps GUIFlash) | S | Low |
| R4 | Hook retry report outside the guard | `core/client/battle/hooks/__init__.py:38-40` | `_report(on_result, …)` runs outside the try, so an exception in `on_result` escapes into the `BigWorld.callback` retry. | Move it inside the try, or wrap it with `safe`. | One escape path closed | XS | Very low |
| R5 | `once_space_created` never re-armed | `features/hangar_space/client/space.py:71-77`, `__init__.py:189-192` | If the player enters a battle before the hangar space is created, the subscription stays on the old hangar object and `waiting` stays True, so the feature never subscribes again. | Reset `waiting` (and drop the subscription) on `battle_enter`. | Hangar looks keep working after a quick join | XS | Low |
| R6 | Missing guards on per-frame paths | `features/responsive_reticle/client/__init__.py:73-77` (`handler.getAimingMode`), `features/gun_arc/client/__init__.py:32-40` (`marker[0].x/.y/.z`), `core/client/battle/teams/__init__.py:56-65` (`info.vehicleID`, `info.team`) | Direct attribute access on client objects. The guards catch the error, but it is logged every frame (see P7). | Use `getattr` with a default and return early. | Fewer log storms | XS | Very low |
| R7 | BATTLE-scope listeners added once | `core/client/hud/cover/__init__.py:236-239`, `core/client/hud/stock/__init__.py:228-230` | `g_eventBus` listeners are added once with `EVENT_BUS_SCOPE.BATTLE`. UNVERIFIED: if the client clears BATTLE-scope listeners between battles, cover and stock tracking stop silently after the first battle. | Re-add them on `battle_enter` (idempotent), or confirm in the client source and note it. | Rules out a silent second-battle bug | XS | Low |
| R8 | Ticker cancellation | `core/client/timer/__init__.py:36-48` | `stop()` leaves the pending `BigWorld.callback` scheduled; the generation check turns it into a no-op. `Ticker._schedule` also allocates a lambda per tick. | Keep the callback id and `BigWorld.cancelCallback` it on `stop()`. Use a bound method plus `functools.partial` only once per `start`. | Cleaner, slightly cheaper ticks | XS | Low |

What is already right:
- Ticker cleanup on battle leave (`BattlePanel._on_leave`, `TeamTracker.stop → feed.forget`).
- Bounded arena caches (`SEEN_ARENAS_LIMIT=200`, `PLAYED_ARENAS_LIMIT=20`).
- Gameface views are destroyed on space left, with `send -=`.
- Every raw `+=` and `addListener` handler is `@safe`.
- Networking never blocks the game thread: `BigWorld.fetchURL`, or a daemon thread polled at 1 Hz. `SyncTransport` runs only inside replay_upload's `BackgroundRunner`.

## 6. Tooling, build and tests

| # | Area | Files | Problem | Proposed refactor | Value | Effort | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | Smoke-test boots | `tools/tests/test_client_smoke.py:1326-1340` (`StoryTest.setUpClass`, about 80 classes), 3363 lines | 34.8 s, 43 % of the whole suite. Each class boots the modpack from scratch. Each boot spends most of its time in config IO: 9 `components.json` saves × 4 writes, plus stamp reads (§1.1). | (a) P3's batched first-boot save and in-memory stamps make every boot cheaper. (b) Point the durable mirror and the config folder at an in-memory store in the smoke `Game`, if the stories don't check the files on disk. (c) Merge the small stories that play the same scenario into one class. (d) Split the 3363-line file by area. | About −15–25 s per run | S–M | Low |
| T2 | Artwork rendering | `tools/build/setupkit/artwork/render.py:35-69`, `tools/build/rasterize.py:38-47`, `setupkit/artwork/tests/test_previews.py:146-157` | `rasterize.svg_pngs` already batches jobs into one Node run, but `render_preview` calls `svg_png` once per SVG, so both the catalogue and the test spawn Node 31 times. `image.save(..., optimize=True)` adds more. | Render every SVG preview in one `svg_pngs` call (in `render_previews` and in the test), then do the Pillow cover and crop per image. | Catalogue 10 s → about 3 s; test 8.5 s → about 1.5 s | S | Very low |
| T3 | Transport timeouts | `packages/core/tests/test_transport.py:117-124,139-142` | Connecting to `127.0.0.1:1` on Windows waits out the 2 s timeout. | Use `timeout=0.2`, or bind a socket, close it, and use its port. | −4 s | XS | Very low |
| T4 | Test log noise | `tools/testing/_support.py`, `core/log` | 361 log lines and tracebacks are printed during a passing run. | Redirect `core.log._emit` and the log file to a buffer in `_support`, and print it only for failing tests (or with `-v`). | Readable CI output | XS | Very low |
| T5 | Vitest overhead | `apps/game/modpack/vitest.config.ts` | Tests are 7 % of the 19 s. `isolate: true` plus 67 jsdom files spend the rest on import, environment and transform. | Try `isolate: false` for the node-environment files (split into two projects: `node` and `jsdom`), or `pool: 'threads'`. Measure before adopting. | Perhaps −5–8 s | S | Low (shared module state between files) |
| T6 | Parallel Python suite | `tools/run_tests.py` | The runner is serial. After T1–T3 the remaining time is spread over many folders. | Optional: run the per-folder suites in a `multiprocessing` pool. Python 2.7 has it, and per-folder module isolation already holds (`find_duplicate_module`). | Roughly ½ the wall time on 8 cores | S | Low–Med (Windows spawn, `_support` global state) |
| T7 | `ui:build` | `apps/game/modpack/package.json` `ui:build` | Four sequential `vite build` processes take about 5 s. That is fine; the slowness people see comes from `npx`, which adds 6 s per call. | Leave it as is. Optionally drive the four builds from one Node script through Vite's `build()` API. Document `bun run ui:build`, never `npx vite`. | Small | XS | Very low |
| T8 | Hit-viewer textures | `features/hit_viewer` assets (`res/content/battlehits/shell_*.dds`, 6.3 MB) | `.mtmod` is stored uncompressed, so the DDS size is the download size. `shell_AM.dds` is 2.8 MB. | Check the DDS formats. BC1/BC3 (or BC7) with mipmaps at the resolution the viewer actually shows is typically 4–8× smaller. Alternatively, have the manager fetch them on demand. | About −4–5 MB download | S | Low (needs an in-game visual check) |

## 7. Prioritised roadmap

### Quick wins (≤ 1 day each)

1. R1: emit `battle_ready`, `battle_leave`, `hangar` and `tick` even when a capture step fails, and make the battle tickers stop when `not in_battle`.
2. P1 step 1: cache per-panel JSON fragments in `HudSurface`; drop `sort_keys` and `ensure_ascii` for the HUD channel.
3. P3: debounce `ComponentConfig`, `ModePlaces` and `save_state` saves; keep stamps in memory; one save at boot; `WRITE_THROUGH` only for secret files.
4. P2: cache `enabled`, `follow` and `getAimingMode` in `responsive_reticle`, and profile `__rotate` in game.
5. P4: precompute `gun_arc`'s matrix getter, skip renders while still, keep the label instead of hiding it.
6. P7: repeat-limit before `format_exc`, buffered log file, Ticker failure cap.
7. R2: keep the HUD window for the whole GUI space and reset `answered`.
8. U4 + U5: one zero-blur text shadow, transform-based bars, no `grayscale` filter, finite lamp pulse.
9. U2 + U8: `React.memo` the HUD labels, memoise `layoutLabels`, stop the idle polling and listeners.
10. T2 + T3 + T4: one Node run for all previews, short transport timeouts, silenced test logs (about −11 s of tests and −7 s of catalogue).
11. A2 + A5 + A14 + A16: core number and text helpers, constants imported from core, dead code removed.
12. R4–R8: hook-report guard, hangar_space re-arm, `getattr` guards, BATTLE-scope check, `cancelCallback`.

### Medium (1–3 days each)

1. P1 step 2 + U1: per-panel patch protocol between `HudSurface` and the page, applied into a nanostores map with per-label subscriptions.
2. U3: rework the HUD measure loop (changed labels only, no `sizes` dependency, a shared `useSettleMeasure`).
3. P6: install the per-event overrides only while their feature is on or active.
4. P8 + P9 + P10: frame-coalesced HP renders, no disk writes inside a battle, a frame-sliced replay index.
5. T1: cheaper smoke boots (in-memory config store, merged stories, split file).
6. A1: shared `core/hit_book` base for battle_results and hit_viewer.
7. A3 + A4 + A6 + A7: `PanelSpec.of`, editor fallback, `OwnFeed` replacing `DamageTracker`, core `service()`/`lobby_app`/`hangar_space`.
8. A11 + A12: split `gameface/__init__.py` and `bridge.py`, break the component↔hud package cycle.
9. A15: one scale and one bar component in ui-web.
10. U9 + T8: quantise `icons.png`, recompress the hit-viewer DDS textures.

### Large (product decision or ≥ 1 week)

1. A10: retire the GUIFlash renderer and the text half of every panel, after checking the "HUD renderers" line in real logs.
2. A9: drop the config migrations older than the oldest build in the published index, and keep doing so on each release.
3. U7: preact/compat experiment for the hud and viewer pages, kept only if in-game page-ready time improves.
4. A13: naming and i18n layout unification across all features, enforced by `test_layout.py`.
5. A8: remove the ModsSettingsAPI fallback (small in code, but it is a product call).

## Appendix A — periodic callbacks

| Site | Interval | When |
| --- | --- | --- |
| `features/responsive_reticle/client/__init__.py:120` | 0.001 s (every frame) | own battle, feature on |
| `features/gun_arc/client/__init__.py:69,87` | 0.05 s; 0.0 with `fast_redraw` | own battle, tank with yaw limits |
| `features/crosshair/client/__init__.py:98` | 0.1 s | reload or countdown running |
| `features/sixth_sense/client/__init__.py:64` | 0.5 s | lamp lit |
| `packages/core/client/hud/gameface/__init__.py:204` | 0.25 s | battle, cursor shown |
| `packages/core/client/hud/modifier/__init__.py:46` | 0.25 s | edit modifier held |
| `packages/core/client/hud/cover/__init__.py:77` | 1.0 s | battle, covered |
| `packages/companion/app/client/__init__.py:107` | 1.0 s | whole session. In the hangar it fans out to 11+ `tick` listeners: comp7 card every 2 s, crew_xp every 5 s, personal missions every 10 s |
| `features/hangar_space/client/__init__.py:94` | 0.5 s | hangar, preview armed |
| `features/battle_progress/client/__init__.py:57` | 3.0 s, one-shot | battle |
| `features/battle_results/client/last_battle.py:38` | 8.0 s | cards queued |
| `features/battle_hotkeys/client/__init__.py:73` | `notice_s`, one-shot | creates a new `Ticker` per key press |

Raw `BigWorld.callback` sites:
- `gameface/__init__.py:152,156,484`
- `cover/__init__.py:255`
- `lobby_view/__init__.py:87`
- `client/hud/__init__.py:91`
- `battle/hooks/__init__.py:43`
- `bush_circle/client/__init__.py:101`
- `hangar_space/client/__init__.py:206`, `capture.py:173,186`
- `hit_viewer/client/__init__.py:65`, `stage.py:198`, `screen.py:170,203`
- `replay_manager/client/playback.py:61`
- `ui/client/window/controller.py:19`

Every one of them is `@safe` or wrapped in `safe()`.
