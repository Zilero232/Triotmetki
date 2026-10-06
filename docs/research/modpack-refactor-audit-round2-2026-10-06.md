# Modpack refactor and performance audit, round 2 — 2026-10-06

Scope: `apps/game/modpack`. That covers the game Python 2.7 (`packages/*`, `features/*`), the host tooling (`tools/*`) and the `ui-web` Gameface pages. This audit was read-only. It ran against the uncommitted working tree, where the round-1 fixes live.

Round 1 is [modpack-refactor-audit-2026-10-06.md](modpack-refactor-audit-2026-10-06.md), and its item ids (P, U, A, R, T) are reused below. New findings are numbered N1 and up. Paths are relative to `apps/game/modpack/`. Effort, value and risk use the round-1 scale.

## 1. Measurements (same machine as round 1)

| Item | Round 1 | Now | Note |
| --- | --- | --- | --- |
| Python suite (`tools/run_tests.py`) | 81.6 s, 4259 tests | **51.4 s**, 4464 tests | Output is buffered per test (T4) |
| `test_client_smoke.py` | 34.8 s | **11.3 s** (191 tests) | Deferred writes and cached stamps make each boot cheaper |
| `test_ui_smoke.py` | 11.1 s | 5.2 s | |
| `setupkit/artwork/tests` | 9.7 s | 3.5 s | One Node run for all previews (T2) |
| `vitest run` | 19.1 s, 1475 tests | **16.0 s**, 1511 tests | Tests themselves are still only 7 % of that; `isolate: true` is unchanged |
| HUD push encode, 13 panels / 18.3 KB (py2.7, built from the ui-web widget fixtures) | `canonical_json` 1.0 ms | **0.09 ms** with one panel changed, 0.04 ms with nothing changed, 0.66 ms with every fragment rebuilt | P1 step 1 works |
| Resending an equal damage-log widget (`resolve` + deep compare) | — | 0.10 ms | The cost of a no-op `show()` |
| `hud.html` / `index.html` / `viewer.html` | 380 / 598 / 292 KB | 390 / 608 / 292 KB | gz: 116 / 172 / 89 KB |
| hud JS composition (sourcemap) | react-dom 202 KB (61 %) | react-dom 202.3, `entities/hud` 53.4, zod 18.7, `views/hud` 13.0, `shared/lib` 9.9, react 8.0, **ts-pattern 7.7**, `shared/api` 7.0 KB | No dev bridge or preview code in the HUD bundle |
| `icons.png` | 395 KB | 395 KB | U9 not done |
| Hit-viewer book, worst case (30 battles × 160 hits, synthetic) | — | **1.78 MB; `canonical_json` 225 ms**, `json.dumps` without `sort_keys` 47 ms, read 45 ms | See N1 |
| `ssl.create_default_context()` at app start (py2.7) | — | **83 ms** on the first call, 12 ms after | See N8 |

## 2. Round-1 status

| Id | Status | Evidence |
| --- | --- | --- |
| P1 | **Partial** (step 1 done) | `core/hud/surface/__init__.py:235-319`: per-panel fragments, invalidated in `create/update/delete`. `_changes` treats the same dict object as a change. `HUD_JSON` drops `sort_keys` and keeps `ensure_ascii` (`surface/constants.py:17-19`, measured). Step 2 (patch protocol) is not done. |
| P2 | **Partial** | `responsive_reticle/client/__init__.py:186-194`: settings are re-read only when a revision changes. `:179-184`: `getAimingMode` is bound once. `Stillness` skips frames with nothing to turn. Still missing: a frame cap; the overrides are installed at init (`:126-143`); the realm branch (`model/constants.py:3-12`). |
| P3 | **Fixed** (see N2, N3) | `core/storage/deferred.py` + `core/client/storage`: one write per 1 s. Flushed on battle enter/leave, hangar, disconnect and `fini`. `durable/stamps.py` keeps the stamps per folder. `WRITE_THROUGH` is used only for the secret files. |
| P4 | **Fixed** | `gun_arc/client/__init__.py:48-62` resolves `Math` and the projection once. `:124-126` skips unchanged ticks. `:131-132` sends an empty widget instead of `hide()`. |
| P5 | Not fixed | `gameface/__init__.py:225-226` still calls `layout_id()` (openwg) on every `available()`. That runs 3–4 times per `BattlePanel.show` (`has_panels`, `renders_widgets`, `sync_stock` at `core/client/hud/panel/__init__.py:138-146`). |
| P6 | Not fixed | `free_camera/client/__init__.py:51-52` and `crosshair/client/__init__.py:105-115` are installed at init and run per event or per marker update. |
| P7 | Not fixed | `core/log/__init__.py:39` runs `format_exc()` before the limiter. `log/logfile.py` opens and closes the file per line. `Ticker` has no failure cap. `_set_drawn` logs every change (worse now, see N4). |
| P8 | Not fixed | `platoon_points/client/__init__.py:60-75` still rescans every vehicle on each `onVehicleUpdated`. Each damage event still causes two renders. |
| P9 | **Partial** | `save_state` is deferred (1 s), but those writes still land inside the battle. The hit books still save synchronously on battle leave and on results (N1). Each outbox enqueue rewrites the whole file. |
| P10 | Not fixed | `replay_manager/model/constants.py:23` still has `INDEX_BUDGET_S = 0.04`. `_newest_files` still stats every replay. |
| U1 | Not fixed | `hud-protocol.ts:7-19`: full `JSON.parse` + zod per push. Waits for P1 step 2. |
| U2 | **Fixed** | `HudLabel` is `memo`. `use-label-models.ts` keeps styles stable. `measureRef` is stable per id. `layoutLabels` is in a `useMemo`. See N6 for the remaining fan-out. |
| U3 | **Fixed** | `use-panel-sizes.ts:174-182` measures only the panels whose content changed. `useMeasureFrames` replaces the four copies. See N7 for `useFitScale`. |
| U4 | **Fixed** | `hud-text-shadow` is two zero-blur layers (`design-tokens/_hud.scss:49`). `ReloadBox` has four zero-blur layers. |
| U5 | **Partial** | Bars use `transform`. Dead vehicles use `opacity` instead of `grayscale`. The lamp pulse runs 3 times instead of forever. `ShellSlot.module.scss:50` still transitions `height` (10 Hz readout). |
| U6 | Not fixed | 8 + 5 copied tone gradients remain in `DamageLogRow`/`DamageLogTotals`. |
| U7 | Not fixed | preact/compat experiment not run. |
| U8 | **Partial** | Hover polling now runs only while the cursor shows (`use-hovered-panel.ts:25-38`). `use-input-area.ts:37-43` still has a deps-less effect plus a 1 s `setInputArea` interval that runs always. The `use-tween` rAF on mount remains. |
| U9 | Not fixed | `icons.png` is still 395 KB. |
| A1 | **Fixed** | `core/hit_book` (150 lines). The books shrank from 223 to 127 and from 308 to 222 lines. |
| A2 | **Partial** | Four redundant bool checks remain: `core/hud/surface/__init__.py:80,137` and `core/hud/modes/__init__.py:57,87`. |
| A3 | **Partial** | `PanelSpec.of` is used by 9 features. `gun_arc/client/__init__.py:65-73` and `battle_results/client/last_battle.py` still use the long form. |
| A4 | **Fixed** | Six `editor.py` files are deleted. The crosshair calls `editor_spec`. |
| A5 | **Partial** | `TIER_COLORS` and `CLASS_GLYPHS` are shared now. Still copied: `RESULT_TONES` ×3, `ACTION_REFRESH` ×5, `FIXED={'font_size':14}` ×5, `HIDDEN_LAYERS` ×2. |
| A6 | Not fixed | `core/client/battle/damage/__init__.py:12` `DamageTracker` is still dead. The own-feed copies remain. |
| A7 | Not fixed | 7 direct `helpers.dependency` sites remain. |
| A8 | Not fixed | `companion/settings_ui/client/__init__.py:16` still has the ModsSettingsAPI fallback. |
| A9 | Not fixed | `companion/config/constants.py` grew to 403 lines. |
| A10 | Open | Product decision. |
| A11 | Not fixed | `gameface/__init__.py` 553 lines, `layer` 403, `session_stats/client` 362, `bridge.py` 312. |
| A12 | Not fixed | `core/client/component` → `..hud` and `core/client/hud/panel` → `...component`. |
| A13 | Not fixed | |
| A14 | Not fixed | `is_armed`, `PERCENT_SUFFIX`, `verify_request`, `MemoryFile`, `backend_name`, `is_ally`, `is_waiting` and `CONTEXTS` are all still there. |
| A15 | **Partial** | The bars share `shared/lib/bar-fill`, and `shared/lib/css-unit` was added. `TankScale` still duplicates `ThresholdScale`. |
| A16 | **Partial** | `formatReload` is gone. `reticleMarkSource` and `widgetKinds` remain. |
| R1 | **Fixed** | `companion/app/client/__init__.py:77-80` `_step` guards each capture step, and the events always go out. The battle tickers stop when `not in_battle`. |
| R2 | **Fixed** | `gameface/__init__.py:296-309`: the window stays open for the whole space. `answered` is reset in `open`/`close`. |
| R3 | Not fixed | `hud/backend/__init__.py:90-92`: owners still route to a broken backend. |
| R4 | Not fixed | `client/battle/hooks/__init__.py:35,39,46`: `_report(on_result)` still runs outside the try, and the retry `partial` is not `safe`. |
| R5 | Not fixed | `hangar_space/client/__init__.py:190-192`: `waiting` is never reset on `battle_enter`. |
| R6 | **Partial** | The reticle `getAimingMode` read is guarded. `teams/__init__.py:56-65` still reads `info.vehicleID`/`info.team` directly. |
| R7 | Unverified | Unchanged. |
| R8 | Not fixed | `timer/__init__.py:47-48`: one lambda per tick (every frame for the reticle), and no `cancelCallback`. |
| T1 | **Mostly fixed** | 34.8 s → 11.3 s. The file is still 3470 lines and not split. |
| T2, T3, T4 | **Fixed** | See §1. |
| T5 | Not fixed | `vitest.config.ts` keeps `isolate: true`. |
| T6 | Not fixed | Optional. |
| T7 | n/a | |
| T8 | Not fixed | `assets/third_party/battlehits/content/shell_*.dds` still totals 6.3 MB. |

## 3. New findings, ranked

| # | Area | Files | Problem | Fix | Value | Effort | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| N1 | Hit books and outbox: sync encode with `sort_keys` on the game thread | `hit_viewer/client/recorder.py:127,131`, `battle_results/client/hits.py:43,60`, `core/hit_book/__init__.py:148-150`, `core/storage/__init__.py:58` (`canonical_json`, `CANONICAL` in `codec/constants.py:3`), `companion/outbox/__init__.py:41-42` | `JsonFile.write` encodes with `sort_keys=True`, which disables Python 2.7's C encoder. The hit-viewer book holds up to 30 × 160 hits with segments. In the worst case that is 1.78 MB and **225 ms** of encoding at battle leave. A typical book (about 25 hits per battle) is about 280 KB and about 35 ms. The battle_results book adds its own. `resolved()` saves again when the results arrive, which can be inside the next battle. The outbox (up to 2000 events) is rewritten in full on every enqueue and removal. | Use plain `json.dumps(separators=…)` (C encoder, 4.8× faster) for local stores. Keep `canonical_json` only where a byte-stable form matters (signing, the API body). Route the books through `core.client.storage.deferred` and save them on `hangar`, not at battle leave or on results. Cap or shard the outbox. | Removes a 30–225 ms hitch at every battle end, and one inside a battle when results arrive late | S | Low |
| N2 | `DeferredFile` drops data when a write fails | `core/storage/deferred.py:37-49` | `flush()` sets `data = _CLEAN` before `store.write`. An `IOError` (antivirus lock, full disk, mirror race) is logged and the save is lost, with no retry. Before round 1 the caller saw the error, and the next save rewrote everything. | On failure, put the data back (unless a newer write arrived) and re-arm with a backoff. Flush the non-IO exceptions the same way. | Settings are never silently lost | XS | Very low |
| N3 | Exit depends on an unverified `fini()` | `companion/entry/mod_otmetki.py:12-19`, `app/client/__init__.py:140-142`, `ui/profiles/snapshot.py:101` vs `ui/client/host.py:51` | The last second of edits survives only if Lesta calls `fini()` or `onDisconnected` fires (UNVERIFIED). A profile load writes `profiles.json` at once, but `components.json` only up to 1 s later. A crash in between leaves the profile marked active over the old components. | Log one line in `stop()` and confirm it in a real `python.log`. Flush right after a profile apply and after a settings-window close. | Closes the only data-loss window the deferral opened | XS | Very low |
| N4 | Logging on lamp blinks now that the window persists | `gameface/__init__.py:253-259`, `log/logfile.py:76` | `_set_drawn` logs "the page draws …" on every change of the drawn set. Each sixth-sense blink, hotkey notice or last-battle card is one open/append/close of `otmetki.log` on the game thread, plus the `print`. | Log the drawn set once per space, or at debug level. Combine with P7: buffer the log file and flush at 1 Hz. | Fewer IO stalls during fights | XS | Very low |
| N5 | A failing `stop()` leaves a battle panel on screen | `core/client/hud/panel/__init__.py:102-108` | `_on_leave` runs `preview.end`, `hooks.clear`, `stop`, `hide` and `sync_stock` with no guard of its own. If `stop()` raises, `hide()` and `sync_stock()` are skipped. The label stays in `HudSurface` under the `battle` space and shows in the next battle with old data, and its stock element stays hidden. | Guard each step (the `_step` pattern from R1). As a safety net, drop every `battle`-space alias from `HudLayer.shown` and `HudSurface` on `battle_leave`. | Rules out stale panels after one feature bug | XS | Very low |
| N6 | Page caches are keyed by the panel object | `ui-web/src/views/hud/model/hooks/use-panel-content/use-panel-content.ts:14-28`, `views/hud/lib/share-panels/share-panels.ts:7-26`, `views/hud/lib/panel-sizes/panel-sizes.ts:20-24` | `sharePanels` reuses a panel only when the whole panel is deep-equal. Any change of `x`/`y`, `cover`, `visible`, `dock` or `attach` therefore re-parses the rich text, re-resolves the widget and re-renders the widget subtree. It also re-measures that label for 5 frames, because the content counts as changed. One Tab press changes `cover` on every panel: every widget renders again, with 5 forced layouts each. | In `sharePanels`, keep `old.widget` and `old.text` when they are deep-equal even if the panel changed. Key the two caches on `panel.widget` and `panel.text`. | Tab, V and drags stop re-rendering and re-measuring every widget | S | Low |
| N7 | `useFitScale` restarts its measure loop on every render | `ui-web/src/shared/lib/use-fit-scale/use-fit-scale.ts:27`, `ui-kit/molecules/FitBox/FitBox.tsx:10` (used by `CardThumb`, `HudSample`) | `restartKey: content` is the `children` element, which is new on every parent render. Each settings-window re-render restarts a 6-frame loop with 2 `offsetWidth/Height` reads per frame for every card thumb. | Pass a stable key (the sample's id plus the settings revision), or memoise the children. | A smoother settings window with many cards | XS | Low |
| N8 | TLS context built on the game thread at start | `core/client/transport/__init__.py:10-13`, `core/net/transport/tls.py:31-38` | `create_transport()` calls `verified_context()` in `OtmetkiApp.__init__`. `create_default_context()` loads the Windows certificate store: 83 ms here, once per session, during client start. | Build it lazily on the worker thread on the first request. Log "TLS unavailable" from there. | −80 ms of start-up | XS | Low |
| N9 | One bad panel blocks the whole HUD state | `core/hud/surface/__init__.py:314-319`, `surface/push.py:357-364` | A widget holding a non-JSON value (a `Math.Vector3`, a set) makes `_fragment` raise. The whole push then fails every frame until that panel changes, and nothing is drawn. | Encode each fragment in a `try`. On failure, log once per alias and send that panel as `{id, visible:false}`. | One feature cannot blank the HUD | XS | Very low |
| N10 | Hint text fixed at create | `core/hud/layer/__init__.py:194-199` | `panel_hint` is computed only in `props()` (create). A language switch in the settings window keeps the old hint until the panel is re-created. The window persisting (R2) makes that longer. | Re-send `hint` from `update_settings` and on language change, or send hints once per page (P1 step 2). | Correctness | XS | Very low |
| N11 | ts-pattern in the HUD bundle | `entities/hud/crosshair/lib/reticle-mark/reticle-mark.ts`, `crosshair/ui/components/DrumReadout/DrumReadout.tsx`, `features/hud/edit-panels/.../use-panel-drag.ts` | 7.7 KB parsed at every HUD window load for three `match` calls. | Keep it if the rule matters more. Otherwise use plain lookup objects in these three HUD-only files. | −7.7 KB of HUD parse | XS | Very low |
| N12 | Always-on input-area refresh | `views/hud/model/hooks/use-input-area/use-input-area.ts:37-43` | A deps-less effect plus `useInterval(apply, 1000)` calls `gameface.setInputArea` every second for the whole session, in the hangar and in battle, with no editing going on. | Run the interval only while `edit` or `hover` is on. Give the effect `[key]` deps. | Idle page CPU | XS | Low (the refresh exists because Gameface drops the area; keep it while editing) |

What the round-1 refactors did not break, all checked:
- The HUD fragment cache stays correct: features build fresh widget dicts, and an in-place mutation re-sent as the same object counts as a change.
- `HudLabel` memo props are all stable or primitive.
- No raw `BigWorld.callback` site is unguarded (17 sites checked).
- `bus.emit` and `Listeners.notify` isolate each handler.
- The deferred `components.json` is never read back from disk while it is held: `read()` flushes first, and the migration in `migrate_stored` runs before `ComponentConfig` exists.

## 4. Roadmap (remaining work)

**Quick, next round (≤ ½ day each):**
- N1: plain JSON for local stores; books written on hangar entry through `deferred`.
- N2 + N3: retry failed flushes; log in `stop()`; flush after a profile apply.
- N5 + N9: guarded panel leave, battle aliases dropped on leave, per-fragment encode guard.
- N4 + P7: limiter before `format_exc`, buffered log file, no log per blink, `Ticker` failure cap.
- N6 + N7: page caches keyed by content; stable `FitBox` key.
- P5: cache `layout_id()` once it is valid.
- R4, R5, R6, R8: hook-report guard, hangar_space re-arm on `battle_enter`, `getattr` guards in `teams`, `cancelCallback` with no lambda per tick.
- N8, N12, U5 `ShellSlot` height, the A2 leftovers, the A14 dead code, the A16 leftovers, `DamageTracker` (A6).

**Medium:**
- P1 step 2 + U1 (patch protocol, nanostores map).
- P6 (install overrides only while active).
- P8, P9 (rest), P10.
- A3/A5 leftovers, A7, A11, A12, A15 `TankScale`.
- U6, U9, T8, T5.

**Product decisions (unchanged):** A8, A9, A10, A13, U7.

## 5. Fix status: game Python (2026-10-06)

The items of this audit in `packages/*` and `features/*`. The ui-web and style items are left to their own round. Suite after the fixes: 4536 tests OK on 2.7.18; `ruff check .` clean.

| Id | Status | What changed |
| --- | --- | --- |
| N1 | **Fixed** | `JsonFile` writes the compact files with `storage.constants.COMPACT` (no `sort_keys`, so the C encoder runs). `canonical_json` stays for the signed bodies and the profile codes. Both hit books go through `core.client.storage.held_for_hangar`, which writes nothing in a battle or at its end. The books are written by `flush_all_writes()` on the next hangar entry, on a disconnect or in `fini`. Clearing or resizing a book in the hangar writes it at once. A read of the same path flushes a held write first. The outbox keeps writing through, but with the faster encoder. Measured on py2.7 with a synthetic worst-case book (30 × 160 hits, 3.1 MB): `canonical_json` takes 235 ms, `COMPACT` 65 ms. That encode no longer happens at battle leave at all. |
| N2 | **Fixed** | `DeferredFile.flush` keeps the data and its `_pending` entry when the write fails, and re-arms the timer. The failure is logged once, and once more when the write works again. A newer write wins over the data it kept. Any exception counts as a failure, not only `IOError`. |
| N3 | **Fixed** | `stop()` logs `stopping: writing the held saves`, writes every held save and flushes the log file. The UNVERIFIED `fini` note stays in the entry script. A profile load now applies the snapshot, flushes the held saves (`UiContext.flush_saves`), and only then marks the profile active. Closing the settings window flushes too. The hangar entry already flushed, and now also writes the held books. |
| N4 | **Fixed** | `_set_drawn` logs only a label drawn for the first time since the window opened (`drawn_seen`), so a blinking lamp logs once. The log file is opened once and buffered (see P7). |
| N5 | **Fixed** | `BattlePanel._on_leave` runs `preview.end`, `hooks.clear`, `stop`, `hide` and `sync_stock` each in its own guard. Deferred: dropping the battle aliases from `HudSurface` as a second safety net. |
| N8 | **Fixed** | `create_transport()` no longer builds the TLS context. `verified_context()` builds it under a lock on the worker thread at the first request. `ThreadTransport` logs "TLS unavailable" once, from the poll on the game thread. |
| N9 | **Fixed** | `HudSurface._encoded` encodes each panel inside a `try`. A panel that is not valid JSON is logged once and sent hidden, with no text and no widget, until its props change. The other panels still draw. |
| N12 | n/a (Python) | No Python code drives `setInputArea`. The refresh is on the page side (ui-web agent). |
| P5 | **Fixed** | `GamefaceBackend.layout_id()` caches the resource id once it is valid. A missing id is looked up again. |
| P6 | **Fixed** | free_camera installs its `game.handleKeyEvent`/`handleMouseEvent` overrides when a flight starts and restores them when it lands. The crosshair circle override is installed on `battle_enter` only while its switch is on and the circle is scaled, and restored on `battle_leave`. In both cases, a method another mod wrapped after us stays wrapped (`core.hooks.is_restorable`). |
| P7 | **Fixed** | `log_exception` checks the limiter first (key: context, exception type and failing line), and formats the traceback only for a line it will write. `LogFile` keeps one buffered handle per session. It flushes on the first line after 1 s, after every error, on the app's 1 Hz tick and in `stop()`, and closes the handle before a size rotation. `Ticker` stops after `MAX_FAILURES` (100) failures in a row, with one log line. |
| P8 | **Partial** | `platoon_points._on_arena_entry` reads only the vehicle the event names (`getVehicleInfo`), and renders only for a platoon member. Deferred: coalescing the double team_hp/battle_progress render per damage event into one render on the next frame. That changes the render timing the client smoke stories assert on, so it needs its own round. |
| P10 | **Partial** | The index budget is down to 8 ms per slice (`INDEX_BUDGET_S`). While the window wants the page, slices run on every frame through a `Ticker(0)`, which stops once indexing is done. Not done: a name sort before the stat. The auto-rename feature gives replays names that no longer sort by time. |
| R4 | **Fixed** | `BattleHooks._report` calls `on_result` through `safe`. The retry callback is wrapped in `safe`. |
| R5 | **Fixed** | `once_space_created` returns a cancel function. `HangarSpace` drops the wait on `battle_enter`, and the next hangar waits again. |
| R8 | **Fixed** | `Ticker` builds one `functools.partial` per start, keeps the callback id and calls `BigWorld.cancelCallback` on `stop()`. The id is cleared when the callback fires. |
| A6 | **Fixed** (dead code) | `core/client/battle/damage` (`DamageTracker`) is deleted. The four own-feed copies remain. |
| A14 | **Fixed** | Deleted: `is_armed`, `PERCENT_SUFFIX`, `HudLayer.backend_name`, `TeamHp.is_ally`, `EscapeWatchdog.is_waiting`, `ui.components.CONTEXTS`, and the responsive_reticle realm branch (one `ROTATE_ARGUMENTS`). `MemoryFile` and `verify_request` (with `verify_signature`) moved to `tools/testing/_support.py`. `_support.captured_log` was added for log assertions. |

Round-2 security items done in the same pass (security-audit-2026-10-06.md «Round 2»):

| Id | Status | What changed |
| --- | --- | --- |
| R2-M2 | **Fixed** (Python) | ISRG Root X1 and X2 (the official PEMs from letsencrypt.org/certs/) are loaded with `load_verify_locations(cadata=…)` next to the system store (`net/transport/constants.py` `TRUSTED_ROOTS`). `test_transport` pins their SHA-256 fingerprints. Without a context, `app.status_text()` returns «TLS недоступен / TLS unavailable», and that text shows in the settings window's account status. `UiContext.status()` also carries `tls: false`, for the page to draw a chip of its own (ui-web, not done here). |
| R2-L1 | **Fixed** | `codec.decode_json` passes `parse_int`/`parse_float` hooks that refuse literals longer than `MAX_NUMBER_CHARS` (32). The replay header parser, the profile codes and every server body go through it. A block with a million digits is refused in milliseconds. |
| R2-L2 | **Fixed** (mod side) | `CredentialStore` keeps an entry whose sealed secret does not open, with both halves untouched. It logs that once per account and tries again on the next start. A new binding or a rewrite keeps it. An unbind removes it. `bound_at` is written in both halves (`PUBLIC_FIELDS`). The manager side is separate. |
| R2-L7 | **Fixed** | Every full-match pattern in the game sources ends in `\Z` instead of `$` (20 patterns). There are tests for the profile slug and the release version. |

Versions: hit_viewer 0.3.4, battle_results 0.3.3, free_camera 0.1.3, platoon_points 0.2.3 and replay_manager 0.3.6 were bumped one patch above the published release. Lines were added to the unreleased entries of core 0.9.4, companion 0.8.4, ui 0.9.4, crosshair 0.6.4 and hangar_space 0.2.2.

## 6. Fix status: ui-web pages (2026-10-06)

The page-side items, in `apps/game/modpack/ui-web` (`packages/ui/gameface` is rebuilt). After the fixes:

- `vitest run --project modpack-ui`: 170 files and 1597 tests pass.
- `bun run verify` is green for ui-web.
- `knip` is clean.
- The HUD screenshots of every widget fixture (`scratchpad/hud-perf/shot.mjs`, sun and snow backdrops) match the build from before the changes. No pixel differs by more than 24, and the largest difference is 2 of 765.

| Id | Status | What changed |
| --- | --- | --- |
| N6 | **Fixed** | `sharePanels` keeps the old `widget` object when it is deep-equal, even if the panel itself changed (`x`/`y`, `cover`, `visible`, `dock`, `attach`, `hint`). `usePanelContent` keys its two caches on content instead of the panel object. The widgets cache is a `WeakMap` on `panel.widget`. The rich-text lines are a `Map` on `panel.text`, rebuilt each push so it holds only the current texts. On a move, Tab, V or a hint change, `lines.get(id)` and `widgets.get(id)` therefore keep their identity. `changedPanels` finds nothing to measure, and `widget.node` stays the same element, so React does not re-render the widget subtree. Tests: `share-panels` (a moved or covered panel keeps its widget object), `use-panel-content` (resolved widget and lines survive a move and a cover). |
| N7 | **Fixed** | `FitBox` takes a `contentKey`, and `useFitScale` restarts its 6-frame loop only when `[contentKey, max]` changes. `HudSample` keys on `JSON.stringify([widget, text])` (memoised in `useHudSample`). The carousel thumb keys on its model. A re-render with the same content does one size read after layout and starts no loop. That read keeps the fit right when the frame size changes, for example on a window-frame resize. Tests: `FitBox` keeps its loop on a same-content re-render, and restarts it on new content. |
| N10 | **Page side ready** | The page reads `panel.hint` on every push, and a hint-only change no longer rebuilds the widget (N6). When the game re-sends the hint after a language switch, the shown hint updates. A test in `use-hud-overlay` covers this. The game side, re-sending `hint`, belongs to the Python round. |
| N11 | **Fixed** | ts-pattern is out of the HUD bundle. The three hud files are free of it: `reticle-mark` uses guard clauses whose last branch is type-checked (a new part kind fails to compile), `DrumReadout` uses three exclusive conditions, and `use-panel-drag` uses two guards. The settings page keeps ts-pattern (`FieldControl`, `EditorControl`). `hud.html` went from 390.1 to 383.2 KB (114.0 KB gz). |
| N12 / U8 (input area) | **Fixed** | The area is applied when its key changes (`[key]` deps instead of a deps-less effect). The 1 s refresh (`useInterval`, paused by default) runs only while `edit` or `hover` is on, or after the engine refused the area (`setInputArea` returned false). It stops once the area is accepted again. Tests: no refresh when nothing is edited or hovered. After a refusal, the area is retried on the next tick. |
