# Style audit, round 2 — 2026-10-06

Scope: `apps/game/modpack` (the game Python 2.7 in `packages/*` and `features/*`, the host tooling in `tools/*`, `ui-web`) and `apps/game/manager` (Rust `tauri/src`, React `web/src`). The audit was read-only and no code changed.

Rules checked: the root `CLAUDE.md`, `apps/game/modpack/CLAUDE.md`, `apps/game/manager/CLAUDE.md`, `docs/guides/`, `.claude/rules/**`. The checks cover:

- readability: one idea per line, functions of about 30 lines, guard clauses, lookup tables over `if` ladders, full-word names, one behaviour per test;
- reuse of libraries and the standard library;
- constants in `constants.py` / `config/*.constants.ts`, and two or more TS parameters taking one object;
- comments: none in TS or Rust; in Python only provenance or why, and docstrings only on the core public API and the app host interface.

Method:

- `git diff --stat 6b023ed93` (11 commits plus the working tree, 1585 files) gave the map of changed code. The large changed files were read one by one, and the rest was sampled.
- Scripts (AST and token scans, kept in the scratchpad) produced the counts: comments, docstrings, module-level literals, function lengths, positional parameters, multi-assert tests and hand-rolled clamps.
- The previous reports are [modpack-library-audit-2026-10-06.md](modpack-library-audit-2026-10-06.md) (ids `L-*` below) and [modpack-refactor-audit-2026-10-06.md](modpack-refactor-audit-2026-10-06.md) (ids `R1-*`). Their open items were re-checked.

Paths below are relative to `apps/game/modpack/` (`mp/`) or `apps/game/manager/` (`mg/`).

## Clean areas

- No comments in TS (ui-web and manager web) or in Rust.
- No `interface` declarations.
- No `filter(Boolean).join(' ')` class joins (clsx is used everywhere).
- Every `config/*.constants.ts` object is `as const`.
- ts-pattern has been adopted (6 files in ui-web, 5 in the manager).
- No `print` outside `core.log` and the entry scripts.
- No `assert a and b` and no `assertTrue(a and b)`.
- Python functions stay within the ruff caps (one function is over 35 lines).

## Previous rounds: status

| Id | Item | Status |
| --- | --- | --- |
| L-T1, L-T2 | JSON separators; `attrs`/`contextlib2` listed as direct requirements | fixed |
| L-P1 / R1-A1 | shared HitBook | fixed (`core/hit_book`) |
| L-P2 | guarded listeners | fixed (`Listeners` in `core/client/moe`, `lobby_view`) |
| L-P3 | `format_signed` | fixed (`core/format/number.py:20`) |
| L-P5 | one `HEX_COLOR` | fixed |
| L-U1, L-U2, L-U4, L-U6, L-U8, L-U9, L-U10 | `use-measure-frames`, `css-unit`, `subViewModels`, `sprite-cell`, ts-pattern, remeda clamp, `easing` | fixed |
| R1-A3 | `PanelSpec.of` | fixed (2 direct `PanelSpec(` left) |
| **L-P7** | hand-rolled clamps | fixed: `core.compat.clamp` / `fraction` replace the 22 sites (PY10) |
| L-U3 | `percentText` copied | fixed in this round (see U3): one `percentText` and one `deltaText` in `shared/lib/format-number` |
| L-U7 | document binders through reactuse | open (kept for "later") |
| **L-T4** | `'--flag' in argv` | fixed: argparse in the 5 CLIs (T2) |
| R1-A2 | redundant `and not isinstance(v, bool)` | 4 sites left (of 17) |
| R1-A4 | trivial `model/editor.py` | 8 left (`camera`, `minimap`, `damage_log` are 9–10 lines each) |
| **R1-A5** | constants copied | fixed (PY15) |
| **R1-A6** | dead `DamageTracker`; own-feedback code copied | `DamageTracker` is gone (verified); `_on_feedback` is still copied in 6 features (`battle_progress`, `battle_results/client/hits.py`, `damage_log`, `hit_viewer/client/recorder.py`, `marks_panel`, `platoon_points`): open |
| **R1-A7** | direct `helpers.dependency` | fixed (PY16) |
| R1-A8 | ModsSettingsAPI view | open (`companion/settings_ui/client/__init__.py`) |
| R1-A9 | config migrations | open (`migrate.py` 247 lines, `companion/config/constants.py` grew to 403) |
| R1-A10 | GUIFlash renderer | open |
| **R1-A11** | oversized modules | **open**: `core/client/hud/gameface/__init__.py` 553 lines, `core/hud/layer` 403, `companion/config/constants.py` 403, `session_stats/client` 362, `replay_manager/client` 341, `ui/bridge/bridge.py` 312 |
| R1-A12 | `core/client/component` ↔ `core/client/hud/panel` cycle | open |
| R1-A13 | component id naming | open: `PANEL_ID` in 10 features, `SECTION` in 25 |
| **R1-A14** | dead and test-only code shipped | fixed before this pass (verified, PY14) |

## Findings

Impact: **H** costs a reader or a player something now, or breaks a hard rule at scale. **M** is a clear rule violation in a few places. **L** is cosmetic or local. *New* marks an item neither previous report has.

### Modpack — Python game code

Status (2026-10-06): PY1–PY18 are fixed and PY19 is fixed where the names are ours. The suite (4557 tests) and ruff pass after every group.

- PY1: 66 «what» comment blocks are deleted (`marks_panel` card, widget, page, preview, cells, history, research and the client cards, `hangar_space` capture, previews and model, `replay_manager` page, playback, launch, index, library, `battle_results` views, `exchange.perform`, `upload.py` listener note, …), and 11 are cut down to their reason (the `card.py`, `widget.py` and `hangar_space/client` headers, `override_changes`, `environment_changes`, `replaced_reticle_parts`, `tank_progress`, the marks history file, personal missions). The 208 keyword-free blocks left were read one by one: each says why (a client rule, a race, a compliance limit). The suggested test_layout token guard was not added: a 3-line «why» without a keyword is common and would fail it.
- PY2: 54 docstrings removed (features, companion outside the host interface, 6 in tests). 18 that carried a client source or a reason became a `#` comment (`HangarFlight`, `ReplayFlight`, `normalized_space`, `override_changes`, `SetupInjector`, `parse_advice`, `CredentialStore`, `is_valid_server_url`, `is_dev_install`, `migrated`, `exact_moe`, …). The scan finds none left.
- PY3: 66 literal comparisons now use named constants next to the schema choices they mirror: `marks_panel` `STYLE_*` and `core.moe.COLOR_MODE_*` (`COLOR_MODES` moved to core), `crosshair` `RELOAD_*`, `DRUM_*`, `STATE_HEALTH`, `damage_log` `KIND_*`, `OUTCOME_*`, `SOURCE_SHOT`, `STYLE_*`, `hit_viewer` `COMMAND_*`, `core.hit_book` `PART_*`, `OUTCOME_*`, `bush_circle` `MODE_*`, `comp7_helper` `STATUS_*`, `sixth_sense` `LAMP_*`, `team_hp`, `personal_missions`, `platoon_points`, `battle_results` (`BONUS_*`, `KIND_RECEIVED`, `RESULT_WIN`), `gun_arc`, `event_trackers`, `depot_seller`, `hangar_info`, `core.hud.icons`, `settings_share` (`GROUP_*`, `ACTION_EXPORT`), `binding` `REASON_NO_ACCOUNT`, `ui` `ACTION_SETTINGS_EXPORT`, `payload` `AVATAR_KEY`. Six stay literal on purpose: an HTTP header name (`codec`), `sys.platform` and `~` (`durable/paths`), and two own-protocol field names in `core/hud`.
- PY4: `crosshair` `_reload_value` → `RELOAD_VALUES` table; `hit_viewer` `_valid` → `VALIDATORS`; `marks_panel.format_panel` → `LINE_KEYS`; `session_stats` result counters → `RESULT_COUNTERS`; `packed_xml._value` → `DECODERS` (T4). `placement.vehicle_vector` is three chained steps (each part composes the one before), so it got named constants and guard clauses instead of a table. `replay_file/header.py` and `session_stats/model/text.py` no longer hold a nested ternary.
- PY5: the preview samples are i18n keys translated in `model/preview.py`, ru and en: `personal_missions` (`pm_preview_*`), `platoon_points` (`platoon_points_preview_own` / `_mate`), `battle_loadout` (`battle_loadout_preview_*`, 10 strings), `battle_results` (`br_preview_map`). Tank and module names stay literal.
- PY6: `core.log.guarded(context, fallback=None)` decorates a read: it logs under `context` and returns a deep copy of `fallback`; `safe` is now `guarded(func.__name__)`. 22 blocks use it (`auto_reserves`, `auto_resupply`, `battle_loadout` ×4, `comp7_helper`, `depot_seller` ×2, `event_trackers` ×2, `hangar_tweaks`, `hit_viewer` ×4, `update_notice`, `crew_xp` ×2, `personal_missions`, `bush_circle`, companion `loadout` and `settings_share`, the stock reticle restore). 36 `log_exception` calls stay: core's own guards (hooks, timer, registry, garage processors), handlers whose fallback is computed or that call a callback, and contexts built from a value.
- PY7: `core.storage.write_bytes_atomic(path, data, write_through=False)` (suffix `TEMP_SUFFIX` in `core/storage/constants.py`) backs `JsonFile.write` and `PreviewStore.save`.
- PY8: `placement.py` uses `_add if is_point else _turned_only`; `card.percent_history`, `widget.stars_of`, `thumbnail_rows`, `encode_png`, `hangar_space._slots_text` / `ui_thumb` / `space_names` and `decode_message` are written in steps; the 22 `x, self.x = self.x, None` swaps are two assignments.
- PY9: 214 `dict((k, v) for …)` became dict comprehensions (game code, tests and tooling); ruff `C402` keeps it so.
- PY10: `core.compat.clamp(value, low, high)` and `fraction(value)` replace 22 hand-rolled clamps.
- PY11: moved to `constants.py`: `battle_results` `APPEND`/`PUSH`/`HOLD`, `hit_viewer` `MOVE_FIELDS`/`TEXT_FIELDS`/`NO_AIM`, `hangar_space` `ACTIONS`, companion `battles/client/constants.py` (`SERVICE_MODULE`, `SERVICE_NAME`, `POSTED_EVENT`), `SCHEMA_VERSION` to `payload/constants.py`. Kept on purpose: `version.py` (`MOD_ID`, `MOD_NAME`, `VERSION`, read by `tools/build/layout.py`) and `UI_ID` are package descriptors; `minimap` `ACCOUNT_FIELDS` and `core/hud/surface` `_PANEL_FIELDS`/`_PAGE_FIELDS` are tables of the module's own functions, which the style allows.
- PY12: `HangarSpace._space_names()`, `PREMIUM_FLAGS`, `SLOT_LABELS` and `NO_ENVIRONMENT` in `hangar_space/model/constants.py`.
- PY13: `packed_xml.leaves` uses `collections.Counter`; `responsive_reticle.argument_names` uses `inspect.getargspec`.
- PY14: already fixed before this pass (verified): `is_armed`, `PERCENT_SUFFIX`, `DamageTracker` and `is_ally` are gone, `verify_request` and `MemoryFile` live in `tools/testing/_support.py`, `backend_name` and `is_waiting` only in tests.
- PY15: `RESULT_TONES` is `core.own_result.RESULT_TONES` (keyed by `RESULT_WIN`/`LOSS`/`DRAW`); features import `ACTION_REFRESH` from `core.client.component` (4 copies gone); `HIDDEN_LAYERS` is in `core/lobby_view/constants.py` with `core.client.lobby_view.hidden_layers()`; `FIXED = {'font_size': 14}` ×5 is `core.hud.CARD_FIXED`.
- PY16: the 6 sites call `core.client.game.service`; `lobby_app()` moved into `core.client.game` (hit viewer and the ui window input use it). Only `core.client.game` imports `helpers.dependency` now.
- PY17: `thumbnail.py` and `packed_xml.py` name their struct formats and widths (`BMP_MASKS_FORMAT`, `ROW_ALIGN_BITS`, `CHILD_ENTRY_SIZE`, `ELEMENT_HEADER_SIZE`, …) and read one value through `_unpack_one` / `_uint16` / `_uint32`.
- PY18: `TickBlend` and `Stillness` reset through `clear()` (called by `__init__`); `pack_badge` has `_can_request(arena_id)`.
- PY19: `fmt` → `time_format` (`core.format.clock`, `chat_filter`), `obj` → `value` (`core.codec`), `out` → `row_bytes` / `filtered` / `out_dir`. `vo` stays where it overrides a client signature.

| # | Impact | Where | Rule | Fix |
| --- | --- | --- | --- | --- |
| PY1 *new*, **fixed** | H | 965 `#` comments carry no provenance, fair-play or Python 2 reason. 306 of them sit outside `constants.py` and tests. Worst: `features/marks_panel/model/card.py:20-35,51,60,87,112` (15), `marks_panel/model/widget.py:21-29,39,67,106,132` (14), `hangar_space/model/__init__.py:58,87,106,135,145,259` (11), `crosshair/model/readouts.py:16-20,41,78,101,208,271` (11), `hangar_space/client/__init__.py:73-79,194`, `hangar_space/client/capture.py:36,139-141`, `core/net/transport/exchange.py:51,65-67`, `replay_upload/model/upload.py:15-18,52,120` | modpack style: "No comments explaining what code does … a `#` comment only says why" | Delete the block comments that describe what a class, function or field is (`# What the card shows: …`, `# One blocking HTTP exchange: …`). Name the fields and functions so they say it. Keep only the client provenance (`RU 1.45 …`), the fair-play lines (`card.py:20-21` stays) and real "why" sentences. Suggested guard: a token check in `tools/tests/test_layout.py` that fails on a comment block of 3 or more lines without a provenance keyword. |
| PY2 *new*, **fixed** | H | 57 docstrings outside the allowed set: 47 in features (`aim_info/model/__init__.py:16,29,36`, `auto_reserves/model/__init__.py:47,72`, `free_camera/model/__init__.py:9,21`, `hangar_space/model/__init__.py:94,119`, `hit_viewer/model/geometry.py:18,51`, `preset_advisor/model/__init__.py:22,32,41,47`, `update_notice/model/__init__.py:37,61,96`, `responsive_reticle/model/__init__.py:34,150`, …), 10 in companion outside `app/client` and `settings_ui/client` (`account_state/__init__.py:1,23,36,44`, `binding/__init__.py:96,155`, `config/__init__.py:29,85,98`, `config/dev.py:16`, `config/migrate.py:215`, `config/user_set.py:7,23`, `marks/client/__init__.py:44`), and 6 in tests (`battle_loadout/tests/test_battle_loadout_client.py:14`, `responsive_reticle/tests/test_responsive_reticle_client.py:56`, `core/tests/test_component_client.py:25`, `test_dpapi.py:34`, `test_own_vehicle_client.py:20,47`, `test_shot_points.py:10`) | "Docstrings only on core's public API and the app host interface … Tests have none" | Remove them. Where a docstring carries client provenance, turn it into a one-line `# RU 1.45 …` comment. |
| PY3 *new*, **fixed** | H | About 55 setting values and wire enums compared as inline literals: `marks_panel/model/card.py:53` and `widget.py:42,117,153` (`'extended'`, `'mark'`, `'custom'`), `marks_panel/model/__init__.py:176,178`, `team_hp/model/__init__.py:91`, `crosshair/model/readouts.py:174-178,193,195,228`, `bush_circle/model/__init__.py:25,41`, `comp7_helper/model/widget.py:28`, `comp7_helper/model/__init__.py:77`, `hit_viewer/model/protocol.py:13-20,48`, `hit_viewer/model/placement.py:30-35`, `damage_log/model/shots.py:148`, `session_stats/model/session.py:213-215`, `core/moe/macros.py:79,81`, … | "literals … live in the concern's `constants.py`" | Name them in the feature's `constants.py` (`STYLE_EXTENDED`, `MODE_MARK`, `PART_CHASSIS`, `RESULT_WIN`, …) next to the schema choices they mirror, and compare against the constant. |
| PY4 *new*, **fixed** | H | `if` ladders that should be tables: `crosshair/model/readouts.py:172-179` (`_reload_value`), `hit_viewer/model/protocol.py:12-23` (`_valid`), `hit_viewer/model/placement.py:28-37` (`vehicle_vector`), `marks_panel/model/__init__.py:176-180`, `core/replay_file/header.py:120` (nested ternary), `session_stats/model/text.py:50` | readability: "Many branches → a lookup table constant" | Use a dict of state → value or state → callable in `constants.py` / the module (`RELOAD_TEXT = {STATE_EMPTY: DASH, …}`, `VALIDATORS = {COMMAND_TAB: _valid_tab, …}`, `RESULT_COLORS = {1: COLOR_UP, -1: COLOR_DOWN, 0: COLOR_MUTED}` keyed by the sign). |
| PY5 *new*, **fixed** | H | Hard-coded Russian preview text the player sees in the HUD editor and the catalogue, with no English: `features/personal_missions/model/constants.py:24-36` (mission names and conditions), `platoon_points/model/constants.py:11-12` (`u'Вы'`, `u'Союзник'`), `battle_loadout/model/constants.py:53-65` (device names and effects), `battle_results/model/battle/constants.py:35` (`u'Малиновка'`) | "Strings shown to the player come from `i18n/` (ru and en in sync)" | Make the sample labels i18n keys (`<id>_preview_*`) and translate them in `model/preview.py`. Tank names may stay literal. |
| PY6 *new*, **fixed** | M | 53 copies of `try: … except Exception: log_exception('…'); return <fallback>`, e.g. `battle_loadout/client/reads.py:171-219` (4 in a row), `auto_reserves/client/reads.py:52`, `crew_xp/client/reads.py:55`, `depot_seller/client/reads.py:85,110`, `comp7_helper/client/reads.py:62`, `bush_circle/client/__init__.py:128,141`; 50 broad `except Exception` in `features/*/client` | "Feature glue starts from core … handlers carry no try/except of their own"; reuse over reinvention | Add `core.log.guarded(context, fallback=None)`, a decorator that logs once and returns the fallback, and apply it to the client reads. Only the import-time `try` fallbacks keep their own `except`. |
| PY7 *new*, **fixed** | M | `hangar_space/client/capture.py:49-57`: `PreviewStore.save` rewrites core's atomic write (makedirs, `.part` file, `replace_file`). Core has the same thing inline in `core/storage/__init__.py:54-62` with a `'.tmp'` literal. | reuse core; literals in `constants.py` | Add `core.storage.write_bytes_atomic(path, data, write_through=False)` and use it in `JsonFile.write` and `PreviewStore.save`. Move the suffix to `core/storage/constants.py`. |
| PY8 *new*, **fixed** | M | Clever one-liners: `hangar_space/client/__init__.py:250` (nested conditional expression), `:159-160` (join over a conditional generator), `hangar_space/model/__init__.py:84` (generator inside a generator), `hangar_space/model/thumbnail.py:116-119` (nested comprehensions with index lookups) and `:141-142`, `marks_panel/model/card.py:65` (comprehension, clamp, round and conditional in one line), `marks_panel/model/widget.py:129`, `hit_viewer/model/placement.py:28` (`shift = (lambda …) if is_point else (lambda …)`, where the first lambda is just `_add`), `capture.py:196` and `core/storage/deferred.py:41` (`key, self.key = self.key, None` swaps) | readability: "One idea per line … no clever one-liners" | Split each into named steps. `placement.py:28` becomes `shift = _add if is_point else _second`. The swaps become two plain assignments. |
| PY9 *new*, **fixed** | M | `dict((key, value) for …)` in 110 places (`hit_viewer/model/protocol.py:26,40`, `core/hud/surface/__init__.py:332`, `core/client/hud/gameface/__init__.py:466`, …) | readability; Python 2.7 has dict comprehensions | Use `{key: value for …}`. The ruff rule `C402` (flake8-comprehensions) can enforce it and is 2.7-safe. |
| PY10, **fixed** | M | L-P7, still open: the 16 clamp sites listed above | reuse / one idea per line | Add `clamp(value, low, high)` and `fraction(value)` to `core/compat` and replace every site. |
| PY11 *new*, **fixed** | M | Module-level literals outside `constants.py`: `battle_results/model/notice.py:9-11` (`APPEND`/`PUSH`/`HOLD`), `hit_viewer/model/protocol.py:8-9` (`MOVE_FIELDS`, `TEXT_FIELDS`), `hit_viewer/model/placement.py:10` (`NO_AIM`), `minimap/model/__init__.py:34` (`ACCOUNT_FIELDS`), `companion/battles/client/results.py:13-15` (`SERVICE_MODULE`, `SERVICE_NAME`, `POSTED_EVENT`), `core/hud/surface/__init__.py:164-165`, `hangar_space/client/__init__.py:70` (`ACTIONS`), `companion/version.py:3-6`, `ui/__init__.py:3` (`UI_ID`) | constants live in the concern's `constants.py` | Move them. `ACTIONS` goes to `hangar_space/model/constants.py`; the `results.py` names go to `companion/battles/client/constants.py`. |
| PY12 *new*, **fixed** | M | `hangar_space/client/__init__.py`: `space_names(available_paths())` is repeated 6 times (`:115,213,240,248,271,283`), the `(True, False)` premium-flag tuple is inline (`:160`, `model/__init__.py:124,139`), and `'premium'`/`'basic'` are literals (`:159`) | one idea per line; constants | Add a `self._space_names()` helper and `PREMIUM_FLAGS = (True, False)` plus the slot labels in `constants.py`. |
| PY13 *new*, **fixed** | M | Standard library not reused: `tools/build/packed_xml.py:106-108` counts by hand (`collections.Counter`); `responsive_reticle/model/__init__.py:34-40` reads `co_varnames` by hand (`inspect.getargspec(function).args[1:]`, which handles methods on 2.7) | "Use the standard library … do not hand-roll" | Replace both. |
| PY14, **fixed** | M | R1-A14 and R1-A6, still open: dead `is_armed`, `PERCENT_SUFFIX`, `DamageTracker`, and the test-only `verify_request`, `MemoryFile`, `backend_name`, `is_ally`, `is_waiting` shipped to players | "Delete dead code" | Delete them. Move `MemoryFile` and `verify_request` into `tools/testing`. |
| PY15, **fixed** | M | R1-A5, still open: the copied constants listed above | constants come from core | Move `RESULT_TONES` to `core.format`, `HIDDEN_LAYERS` to `core/client/lobby_view/constants.py` and `FIXED_FONT = {'font_size': 14}` to `core/hud/panel/constants.py`; features import `ACTION_REFRESH` from core. |
| PY16, **fixed** | M | R1-A7, still open: the 6 direct `helpers.dependency` imports | "Feature glue starts from core" (`core.client.game.service`) | Call `service(I…)`. Merge `lobby_app()` into core. |
| PY17 *new*, **fixed** | L | `hangar_space/model/thumbnail.py:57,75,133,140` and `tools/build/packed_xml.py:43,72,77,82`: magic numbers (`12`, `31`, `32`, `4`, `6`, `0xFFFFFFFF`) and struct formats inline; `_unpack(…)[0]` repeated | literals in `constants.py` | Name the formats and widths (`BMP_MASKS_FORMAT`, `ROW_ALIGN_BITS`, `CHILD_ENTRY_SIZE`). |
| PY18 *new*, **fixed** | L | `responsive_reticle/model/__init__.py` `clear()` calls `self.__init__()`; `features/pack_badge/client/__init__.py:93` has a four-part guard on one line | readability (guard clauses) | Use an explicit `reset()`, and a named predicate `_can_request(arena_id)`. |
| PY19 *new*, **fixed** | L | Abbreviated names: `fmt` (11), `out` (15), `obj` (4), `vo`/`fp` parameters | "Full-word domain names" | Rename to `struct_format`, `row_bytes`, `value`. `vo` stays where it overrides a client signature. |

### Modpack — tooling and tests

Status (2026-10-06): T2 and T4 are fixed, T1 is settled by a written rule, T3 is fixed for the worst suites.

- T1: the rule now says what the code does. `.claude/rules/modpack/style.md` exempts host tooling: a tool is a script run on the host, so it keeps its literals as `UPPER_CASE` names at the top of its module, the way the repo's root `scripts/*.mjs` do, with no `constants.py`. Forty `constants.py` files for single-module scripts would split each script from its own settings for no reader's gain.
- T2: `tools/assets/lut.py`, `tools/assets/render.py`, `tools/build/asset_sets.py`, `tools/build/hangars.py` and `tools/run_tests.py` parse their flags with argparse (`--write` / `--check` mutually exclusive; `hangars.py` parses the `--check` it documents; an unknown flag is an error now instead of being ignored).
- T3: split or reduced to one literal comparison: `companion/tests/test_payload.py` identity (10 asserts) and stats (12), `tools/build/tests/test_build.py` core paths (9, now a missing-paths list plus its own `_next_gen` test), `replay_upload` contract constants (7), `pack_badge` `is_anonymised` (two cases), and the touched `personal_missions` (2 tests to 7) and `battle_loadout` widget suites. The rest of the 377 stay for a later pass.
- T4: `packed_xml._value` reads through `DECODERS`.

| # | Impact | Where | Rule | Fix |
| --- | --- | --- | --- | --- |
| T1 *new*, **fixed** | M | `tools/` has no `constants.py` at all. About 40 modules hold their literals at module level (`build/asset_sets.py` 16, `dev/client/__init__.py` 15, `build/layout.py` 15, `build/hangars.py` 14, `testing/_support.py` 13, `assets/lut.py` 12, `build/packed_xml.py:16-22`) | modpack style: constants in the concern's `constants.py` (only docstrings are excepted for `tools/`) | Either add `constants.py` per tool package, or write the exemption into `.claude/rules/modpack/style.md`. Today the rule and the code disagree. |
| T2, **fixed** | M | L-T4, still open: 5 `'--flag' in argv` CLIs | argparse (stdlib, already used) | Use argparse in all 5. `hangars.py` documents `--check` it never parses. |
| T3 *new*, **partial** | M | Tests that check more than one behaviour: 377 of 4464 Python tests have 2 or more asserts, and 61 assert inside a loop. Worst: `companion/tests/test_payload.py:49` (10 asserts) and `:63` (12), `tools/build/tests/test_build.py:86` (9), `replay_upload/tests/test_replay_upload.py:1121,1139` (7). New ones: `pack_badge/tests/test_pack_badge.py:44` (two cases in one test) | readability (tests): "one behaviour each … one condition per assert" | Split the tests, or compare one literal dict or list per test. Use `subTest` only where the cases are truly one behaviour. |
| T4 *new*, **fixed** | L | `tools/build/packed_xml.py:57-68` `_value`: a 5-branch ladder | lookup table | Use `DECODERS = {STRING: _string, INT: _int, …}`. |

### Modpack — ui-web

Status (2026-10-06): U1–U6 are fixed. U7 is partly fixed. `packages/ui/gameface` is rebuilt. The HUD screenshots of every widget fixture (`scratchpad/hud-perf/shot.mjs`, sun and snow) match the build from before the changes: no pixel differs by more than 24, and the largest difference is 2 of 765.

- U1: every helper with two positional parameters takes one object. Its `<Fn>Input` type lives in the sibling `*.types.ts`. The scan found 19, two more than listed: `hit-panel.ts` `contains` and the dev bridge's `replaysSnapshot`. `readGlobal({ scope, name })` and the view-env `call({ method, args })` changed at every call site. `isOneOf` is now remeda `isIncludedIn`. `use-fit-scale` `isSame` is now remeda `isShallowEqual`. The copied `valueOf` in `card-preview` and `schematic` became one `lib/field-value` (`fieldValue({ fields, key })`). What is left is exempt: engine callbacks (`view-model.ts`, the mock's `engine.on`) and `Array` callbacks.
- U2: `MARKER_PATHS` is in `gun-arc/config/marker-paths.constants.ts`. `DEFAULT_REPLAY_FILTERS` is in `replay/config/replay-filters.constants.ts` (`as const satisfies ReplayFilters`). `ENGINE_SHIMS.focusPairs` is in `engine-shims.constants.ts`. `EDITOR.backdropLabels` and `EDITOR.captions` are in the component-card config. The reticle opacity lookup is `RETICLE_MARKS.paint.opacity`, and `ReticleMark.tsx` uses it too. Three more moved:
  - the marks-panel style enum went to `MARKS_PANEL.styles`;
  - `lib/marks-report/marks-report.constants.ts` went to the component-card `config/`;
  - `widget-registry.constants.ts` went to `features/hud/widget-registry/config/widget-lines.constants.ts`.
- U3: `percentText(value)` and `deltaText({ value, unit })` live in `shared/lib/format-number` and have tests. The marks panel and the marks report both use them. The report keeps only its glyph swap (`plain`).
- U4: `now` is a `useState(nowSeconds)` inside `useReplaysBrowser`. `nowSeconds` is in `lib/browser-view`. `ReplaysBrowser.tsx` has no state now.
- U5: The inner helpers moved to tested `lib/` functions:
  - `use-panel-sizes`: `readCountdown`, `elementRef`, and the `remember` registry;
  - `use-panel-drag`: `pressedTarget`, and `useEffectEvent` instead of the `finishRef` sync;
  - `use-scroll-area`: `shared/lib/scroll-binding` (`bindScrollArea`, `changedMetrics`);
  - `use-window-frame`: `frameStyleOf`, `innerStyleOf`, `zoomLimits`;
  - `use-hud-editor`: `placedPanels`, `panelLook`.

  The hook lengths went from 74 to 30, 72 to 68, 69 to 57, 62 to 57 and 58 to 49 lines. What is left in `use-panel-drag`, `use-scroll-area` and `use-window-frame` is event and handler glue, with no maths left in it.
- U6: `use-label-models/_tests` holds 7 renderHook tests. `use-panel-content/_tests` was added as well.
- U7 (partial): 31 tests are split, in the suites of the slices this round touched: share-panels, marks-panel-view, drum-view, team-hp-view, card-marks, marks-report, use-replays-browser, use-hud-editor and input-area. The scan now counts 127 multi-expect tests out of 1209, down from 158 out of 1174. Most of the rest are DOM widget tests that check a few parts of one render.

| # | Impact | Where | Rule | Fix |
| --- | --- | --- | --- | --- |
| U1 *new*, **fixed** | M | Private helpers that take 2 positional parameters (17): `entities/hud/crosshair/lib/drum-view/drum-view.ts:7`, `entities/hud/marks-panel/lib/marks-panel-view/marks-panel-view.ts:30,68`, `entities/hud/team-hp/lib/team-hp-view/team-hp-view.ts:23`, `shared/api/gameface/scope/scope.ts:35`, `shared/api/gameface/view-env/view-env.ts:29`, `shared/lib/fit-scale/fit-scale.ts:3`, `shared/lib/use-fit-scale/use-fit-scale.ts:15`, `views/hit-viewer/lib/hit-step/hit-step.ts:16`, `views/hit-viewer/lib/viewer-frame/viewer-frame.ts:9`, `views/hit-viewer/lib/viewer-protocol/viewer-protocol.ts:9`, `views/preset-advisor/lib/card-marks/card-marks.ts:17`, `widgets/component/component-card/lib/card-preview/card-preview.ts:7`, `…/editor-layout/editor-layout.ts:15,38,44` | "Two or more parameters → one object (`<Fn>Input` in `*.types.ts`)" | Change each to take `({ … }: XInput)` with the type in the sibling `*.types.ts`. (`view-model.ts:17` is an engine callback and is exempt.) |
| U2 *new*, **fixed** | M | Literal module constants outside `config/`: `entities/hud/gun-arc/lib/marker-path/marker-path.ts:5,15` (`OCTAGON`, `CENTRE_PATHS`), `entities/replay/replay/lib/filter-replays/filter-replays.ts:8` (`DEFAULT_REPLAY_FILTERS`), `shared/lib/engine-shims/engine-shims.ts:25` (`FOCUS_PAIRS`), `widgets/component/component-card/model/hooks/use-component-editor/use-component-editor.ts:17,19` (`BACKDROP_LABELS`, `EDITOR_CAPTIONS`), and an inline lookup object in `entities/hud/crosshair/lib/reticle-mark/reticle-mark.ts:99` | constants-and-config: "a module-level `const` holding a literal value outside `config/` is a finding" | Move them to the slice's `config/<concern>.constants.ts` (or `engine-shims.constants.ts`, the pattern `shared/lib` already uses). |
| U3, **fixed** | M | L-U3, still open: `percentText` ×2, plus a local `deltaText` in `marks-report.ts:15` that copies `marks-panel-view` | reuse | Export one `percentText` and one `deltaText` from `shared/lib/format-number` (with a `dash` option) and use them in both places. |
| U4 *new*, **fixed** | L | `widgets/replay/replays-browser/ui/ReplaysBrowser.tsx:14`: a `useState` in a component | "components only render, logic in `model/hooks`" | Move `now` into `useReplaysBrowser`. |
| U5 *new*, **fixed** | L | Hooks well past 30 lines: `views/hud/model/hooks/use-panel-sizes` 74, `features/hud/edit-panels/model/hooks/use-panel-drag` 72, `shared/lib/use-scroll-area` 69, `widgets/window/window-frame/model/hooks/use-window-frame` 62, `widgets/hud/hud-editor/model/hooks/use-hud-editor` 58 | readability (≈30 lines) | Move the inner helpers (`readChanged`, `measureRef` registry, drag maths) to `lib/<concern>` pure functions. |
| U6 *new*, **fixed** | L | `views/hud/model/hooks/use-label-models/` has no `_tests/` | folders: a `use-<x>/` folder gets `_tests/` | Add a renderHook test. |
| U7 *new*, **partial** | L | Tests that check more than one behaviour: 169 of 1105 `it` blocks have more than one `expect` | tests: one behaviour each | Split them where the expects check different behaviours. |

### Manager — web

Status (2026-10-06): every MW item is fixed.

- MW1: `useInstallWizardState` keeps only step and selection state. The pure derivation is in `lib/wizard-view` (`wizardGroups`, `chosenGroups`, `wizardPreview`, `wizardSelection`, `defaultPreset`, `presetOptions`, `parkedCount`, tested). The install is `use-install-mutation`, the profile activation is a `useMutation` (`use-apply-profile`), and the installer-profile import is `use-load-profile`.
- MW2: `conflictItems` is one mapper per kind. The location → kind map is `OVERRIDE_KINDS` in `widgets/conflict-report/config`.
- MW3: `fromUnixSeconds` uses date-fns `fromUnixTime`.
- MW4: `shared/lib/toggle-set` (`toggledSet({ set, item, isOn })`) is used by the report form, the cache cleaner and the wizard.
- MW5: `useNavKeys` uses reactuse `useWindowEvent`. The selectors are `NAV_SELECTORS`, and the hook has a renderHook suite.
- MW6: `ReleaseCard` and `ReleaseChanges` are components, and the hook returns `isEmpty`.
- MW7: remeda `clamp` for the wizard steps, `sumBy` in `lib/cache-rows`.
- MW8: `use-report-form` → `use-send-report`, `use-save-report` and `lib/report-rows`. `use-clear-cache` → `use-clear-cache-mutation` and `lib/cache-rows`. `use-profile-actions` → `use-profile-write`, `use-copy-profile-code` and `lib/enabled-components`. `use-status-dock` → `use-dock-lines`.
- MW9: `sameSelection({ left, right })`. The two positional `onToggle(part, checked)` handlers take `{ part | id, checked }`.
- MW10: the multi-behaviour tests in the touched suites and the worst pure-lib ones are split (catalog-rows, selection, conflict-items, manager-error, preview-src, locale, sync-conflicts, status-view, the wizard hook).

| # | Impact | Where | Rule | Fix |
| --- | --- | --- | --- | --- |
| MW1 *new*, **fixed** | H | `web/src/features/setup/install-modpack/model/hooks/use-install-wizard-state/use-install-wizard-state.ts:22-173` is a 151-line hook. It does pure derivation (`groups`, `preview`, `chosenGroups`, `parkedCount`), two mutations, a `try/catch` async `applyProfile` (`:84-91`) and Set toggles inline. | readability (≈30 lines, one level of abstraction); TanStack Query for async state | Move `groups`/`preview`/`chosenGroups` into `lib/wizard-view` (pure, tested), the install into `use-install-mutation`, and `applyProfile` into a `useMutation`. The state hook keeps only step and selection state. |
| MW2 *new*, **fixed** | M | `web/src/widgets/conflict-report/lib/conflict-items/conflict-items.ts:5-74`: 70 lines of `items.push`, plus a `'res_mods'` literal at `:64` | readability; constants in config | Write one mapper per kind (`missingItems`, `replacedItems`, `duplicateItems`, `foreignItems`, `overrideItems`), each about 10 lines, and concatenate them. Move `'res_mods'` to `config`. |
| MW3 *new*, **fixed** | M | `date-fns` is declared in `mg/package.json:45` and imported nowhere. `web/src/shared/lib/local-date/local-date.ts:1` re-implements `fromUnixTime`. | reuse what is installed; no unused dependencies (knip) | Use `fromUnixTime` in `local-date`, or drop the dependency. |
| MW4 *new*, **fixed** | M | The "toggle a Set" one-liner, copied 3 times: `features/report/report-problem/model/hooks/use-report-form/use-report-form.ts:96`, `features/settings/clear-cache/model/hooks/use-clear-cache/use-clear-cache.ts:66`, `use-install-wizard-state.ts:167` | one idea per line; reuse | Add `shared/lib/toggle-set` (`toggledSet({ set, item, isOn })`) with tests. |
| MW5 *new*, **fixed** | M | `widgets/app-shell/model/hooks/use-nav-keys/use-nav-keys.ts:12-28`: a hand-written `window` keydown `useEffect`; selector literals `'nav'` and `'button[data-nav-item]'` at `:31` | reuse (reactuse `useWindowEvent`, already used across ui-web); constants in config | Add `@siberiacancode/reactuse` to the manager (catalog version) and use `useWindowEvent('keydown', …)`. Move the selectors to `config`. |
| MW6 *new*, **fixed** | M | `views/updates/ui/UpdatesView.tsx:33-67`: conditional JSX nested 5 levels inside `QueryState` | components only render; one idea per line | Extract `ui/components/ReleaseCard` and `ReleaseChanges`, and return the empty state from the hook. |
| MW7 *new*, **fixed** | L | `use-install-wizard-state.ts:159-160` clamps by hand (`Math.min`/`Math.max`); `use-clear-cache.ts:58` sums with `reduce` | reuse | Use remeda `clamp`/`sumBy` (add remeda to the manager), or a `stepWithin` helper in `lib`. |
| MW8 *new*, **fixed** | L | Long hooks: `use-report-form` 83 lines, `use-profile-actions` 70, `use-clear-cache` 58, `use-status-dock` 56 | readability | Same split as MW1. |
| MW9 *new*, **fixed** | L | `features/setup/install-modpack/lib/selection/selection.ts:68`: `sameSelection(left, right)` takes positional parameters | two or more parameters → one object | Change it to `({ left, right })`. |
| MW10 *new*, **fixed** | L | Tests that check more than one behaviour: 53 of 129 `it` blocks have more than one `expect` | tests: one behaviour each | Split them. |

### Manager — Rust

Status (2026-10-06): every RS item is fixed.

- RS1, RS3, RS6: in `hangars/generate.rs`, the `environments_with` guard comes first and `insert_at` is named. `PlanError::InvalidRecipe` maps to `SkipReason::InvalidRecipe` in one place, `LookOutcome` replaces the nested `Result`, and the zip date is a `ZipDate`.
- RS2: `plan_files` → `plan_file`/`ensure_skies`, `plan` → `group_by_space`/`plan_space`, `plan_look` → `invalid_set`/`missing_texture`, `conflicts::scan` → `missing_components`/`replaced_components`/`PackageScan`/`duplicates`, `dependencies::install` → `plan_placement`, `service::evaluate` → `auto_migrate`/`auto_install`, and `logs::collect` → `Bundle::add_client`.
- RS4: `DecideInput`, `MergeInput`, `ItemInput`, `WriteZipInput`, `SaveReportInput`, `SignedRequest`, `CurrentInput`, `TargetInput`, `MatchingRulesInput`, `MtmodSourcesInput`, `WriteEntriesInput`, `LookInput`. The Tauri commands keep the framework's positional signature.
- RS5: `background/texts`, `deep_link`, `error` (now `error/mod.rs`) and `process` keep their tests in `tests.rs`.
- RS7: a corrupt `release-sequences.json` is not silently reset any more. It is logged as tampering and set aside as `.corrupt`, and the file is rebuilt only from releases verified after that. The refusal to replace the installed modpack with an older one does not depend on the file (security round 2, R2-M3).

| # | Impact | Where | Rule | Fix |
| --- | --- | --- | --- | --- |
| RS1 *new*, **fixed** | M | `tauri/src/hangars/generate.rs:327-339` `environments_with` clones the list and splices before its `looks.is_empty()` guard, so it does wasted work and the guard is out of order | guard clauses first | Move `if looks.is_empty() { return Ok(inputs.list_bytes.clone()); }` to the top. Split the `rposition…map_or` chain at `:329` into a named `insert_at`. |
| RS2 *new*, **fixed** | M | Long functions: `conflicts/mod.rs:148 scan` 69 lines, `dependencies/mod.rs:204 install` 65, `service/check.rs:110 evaluate` 51, `hangars/generate.rs:241 plan_files` 51 and `:341 plan` 47, `logs/mod.rs:103 collect` 50 | readability (the TS/Python rule; the manager CLAUDE.md asks the same shape of Rust) | In `plan_files`, extract the loop body as `plan_file(context, located, hasher) -> FilePlan`. In `plan`, extract `group_by_space` and `plan_space`. |
| RS3 *new*, **fixed** | M | `hangars/generate.rs:241` returns `AppResult<Result<Vec<PlannedFile>, String>>` (nested Result, string error) and `:293` returns `AppResult<Result<PlannedLook, SkippedLook>>` | Rust best practice (typed errors) | Add an `enum LookOutcome { Planned(..), Skipped(SkippedLook) }`, or a `RecipeError(String)` variant that maps to `SkipReason::InvalidRecipe` in one place. |
| RS4 *new*, **fixed** | L | 15 functions take 4 or more positional parameters, while their neighbours use `*Input` structs (`PlanInput`, `BuildInput`, `GateInput`, `SequenceInput`): `report/mod.rs:112 item` (5), `sync/mod.rs:150 decide` (5), `sync/merge.rs:16 merge_items` (4), `report/mod.rs:137 write_zip`, `hangars/generate.rs:293 plan_look`, `:408 write_entries`, `hangars/mod.rs:176 is_current`, `cache/mod.rs:104 target`, `conflicts/mod.rs:98 matching_rules` | consistency with the crate's own `*Input` convention | Add `ItemInput`, `DecideInput`, `WriteEntriesInput`, … for the `pub` ones first. |
| RS5 *new*, **fixed** | L | Inline `#[cfg(test)] mod tests { … }` in `background/texts.rs`, `deep_link/mod.rs`, `error.rs`, `process/mod.rs` | manager layout: `src/<concern>/mod.rs` + `tests.rs` | Move them to a sibling `tests.rs` (`#[cfg(test)] mod tests;`). |
| RS6 *new*, **fixed** | L | `hangars/generate.rs:38` `ZIP_DATE: (u16, u8, u8)` is read as `.0/.1/.2` at `:402` | readability | Use three named consts, or a small `struct ZipDate { year, month, day }`. |
| RS7 *new*, **fixed** | L | `releases/sequence.rs:44-46` `read_seen` quietly turns an unreadable or corrupt `release-sequences.json` into an empty map. That resets the rollback guard without a log line. | errors are visible | `log::warn!` when the file exists but does not parse. |

## Must fix

Ranked by impact for the cost.

1. **PY1**: delete the "what" comment blocks in feature models and core, starting with `marks_panel/model/card.py`, `marks_panel/model/widget.py`, `hangar_space/model/__init__.py`, `hangar_space/client/__init__.py`, `crosshair/model/readouts.py`, `core/net/transport/exchange.py` and `replay_upload/model/upload.py`. Then add the test_layout guard.
2. **PY2**: remove the 57 out-of-place docstrings: features, companion outside the host interface, and tests.
3. **PY5**: move the Russian preview samples (`personal_missions`, `platoon_points`, `battle_loadout`, `battle_results`) into i18n with English.
4. **MW1**: split `useInstallWizardState` (151 lines) into lib, mutation and state hooks.
5. **PY3 + PY4**: name the setting and enum literals in `constants.py`, and turn the `if` ladders into tables (`readouts._reload_value`, `protocol._valid`, `placement.vehicle_vector`, `marks_panel` style switch).
6. **PY6**: add `core.log.guarded(context, fallback)` and remove the 53 copied try/except/log blocks.
7. **PY10 / L-P7**: add `core.compat.clamp` and `fraction`, and replace the 16 sites.
8. **PY14 + R1-A6**: delete `DamageTracker`, `is_armed` and `PERCENT_SUFFIX`; move `verify_request` and `MemoryFile` out of shipped code.
9. **PY7**: add `core.storage.write_bytes_atomic` and use it in `JsonFile.write` and `hangar_space` `PreviewStore.save`.
10. **MW3**: `date-fns` is declared but unused: use `fromUnixTime` or drop it.
11. **U1 + MW9**: convert the 18 two-positional-parameter helpers to object inputs.
12. **U2 + PY11**: move the module-level literal constants into config / `constants.py`.
13. **MW2**: split `conflictItems` into one mapper per kind.
14. **PY8**: rewrite the clever one-liners (`hangar_space/client:250,159`, `thumbnail.py:116-119`, `card.py:65`, `placement.py:28`).
15. **RS1 + RS3**: move the `environments_with` guard first, and type the nested `Result<_, String>` in `hangars/generate.rs`.
16. **T2 / L-T4**: use argparse in the 5 tooling CLIs.
17. **PY15 + PY16 / R1-A5, R1-A7**: core constants (`RESULT_TONES`, `HIDDEN_LAYERS`, `ACTION_REFRESH`, `FIXED` font) and `service()` instead of `helpers.dependency`.

## Counts

| Area | Findings | New | Still open from earlier rounds | H / M / L |
| --- | --- | --- | --- | --- |
| Modpack Python (game) | 19 | 15 | 4 (PY10, PY14, PY15, PY16, which cover L-P7, R1-A5, A6, A7, A14), plus A8–A13 kept as tracked | 5 / 11 / 3 |
| Modpack tooling and tests | 4 | 3 | 1 (L-T4) | 0 / 3 / 1 |
| ui-web | 7 | 6 | 1 (L-U3), plus L-U7 deferred | 0 / 3 / 4 |
| Manager web | 10 | 10 | — | 1 / 5 / 4 |
| Manager Rust | 7 | 7 | — | 0 / 3 / 4 |
| **Total** | **47** | **41** | **6**, plus 7 tracked architecture items (A8–A13, L-U7) | **6 / 25 / 16** |

Fixed since the earlier rounds: 14 items (L-T1, L-T2, L-P1/R1-A1, L-P2, L-P3, L-P5, L-U1, L-U2, L-U4, L-U6, L-U8, L-U9, L-U10, R1-A3).
