# Stock overlays over the battle view (research 2026-10-05)

Which windows and screens the RU 1.45 battle client opens over the battle view, how the modpack learns about each one, and whether our HUD panels give way to it. The panels used to fade only under Tab (and under the Esc menu); the established modpacks hide theirs with the stock HUD under every overlay that hides it. Sources: the decompiled client `izeberg/wot-src` branch `RU`, `v.1.45.0.0 #2284` (the same build as the [client hooks reference](2026-09-29-client-1.45-hooks.md), `C/` = `res/scripts/client/`, extensions under `res/<package>/scripts/client/`), and the competitor code in the [deep dive](../competitors/2026-10-05-modpacks-deep-dive.md) (F2, F3). Code: [core/hud/cover](../../../apps/game/modpack/packages/core/hud/cover/__init__.py) (pure) and [core/client/hud/cover](../../../apps/game/modpack/packages/core/client/hud/cover/__init__.py) (glue).

## How the established modpacks do it

- **Battle Observer** registers its panels as components of the battle page (`BattleObserverLibraryMain.as:37-63`, `battle/__init__.py:87-89`), so the page hides them with its own HUD under every overlay.
- **XVM** draws its labels as page children and copies the visibility of one stock component, `teamBasesPanel` (`UI_teamBasesPanel.as:77-81`, `BattleLabels.as:143-146`).
- **wotstat widgets** listen to `FULL_STATS`, `FULL_STATS_QUEST_PROGRESS`, `FULL_STATS_PERSONAL_RESERVES` (`MainView.py:87-89`).
- All of them **hide fully**, never fade. **Nobody hides under the Esc menu or the F1 help**: the menu is a modal TOP_WINDOW (layer 10) and the page with its HUD stays drawn, dimmed, under it.
- None hides for the radial menu, the chat input, the enlarged minimap, the pre-battle shells panel or the post-mortem panel.

Our panels live in a separate Gameface window (or GUIFlash's view), not on the battle page, so we take the XVM technique: mirror a reference component in the `SharedPage._setComponentsVisibility` wrapper.

## Signals in the client

- **The battle page's components (primary).** `SharedPage._setComponentsVisibility(visible, hidden)` (`C/gui/Scaleform/daapi/view/battle/shared/page.py:197`) is the one call every battle page uses to hide its HUD under an overlay and to show it back: `ClassicPage._toggleFullStats` (`classic/page.py:114-152`; random, ranked, training, Onslaught, epic random, stronghold, event platform, story mode, Waffenträger), `SharedPage._onBattleLoadingStart/Finish` (`page.py:277-300`), `EpicBattlePage._invalidateState` (`epic/page.py:231`: TABSCREEN, OVERVIEWMAP, RESPAWN), `EventBattlePage` and `WhiteTigerBattlePage._toggleEventStats`, `BattleRoyalePage` (spawn choice, winner screen; it overrides the method and calls the base). Each overlay hides every visible component, `teamBasesPanel` among them; no page hides `teamBasesPanel` on its own, and we never suppress it. The snapshot is `as_getComponentsVisibilityS()` (`meta/BattlePageMeta.py:21`).
- **The keys (only a trigger).** `GameEvent.FULL_STATS` (Tab), `FULL_STATS_QUEST_PROGRESS` (the personal missions key), `FULL_STATS_PERSONAL_RESERVES` (the reserves key), `EVENT_STATS` (`C/gui/shared/events.py:54-57`). The first three open one full stats component on its `STATS`, `QUESTS_PROGRESS` or `BOOSTERS` tab (`classic/page.py:203-210`), but `_toggleFullStats` returns early while a modal view exists or the radial menu is open (`:116-129`), so a key alone must not hide anything. Listening to `FULL_STATS` alone is why the personal missions and reserves panels left our panels on top.
- **Gameface windows.** `IGuiLoader.windowsManager.onWindowStatusChanged` and `findWindows` (`C/frameworks/wulf/windows_system/windows_manager.py`); `Window.windowFlags` holds the type and `WINDOW_FULLSCREEN 1024` (`frameworks/wulf/gui_constants.py:58-78`). Scaleform views sit in an `SFWindow` (it has `loadParams`) and are the page's business.
- **V, loading.** `GameEvent.GUI_VISIBILITY` (`ctx['visible']`, `page.isGuiVisible()`), `GameEvent.BATTLE_LOADING` (`ctx['isShown']`).

## The overlays

Effect: **hide** = `visible: false`; **—** = the panels stay.

| Overlay | Modes | Client signal | Effect | Why |
| --- | --- | --- | --- | --- |
| Full stats (Tab) | every mode with full stats | page hides `teamBasesPanel` / shows `page._fullStatsAlias` | hide | the page hides its HUD |
| Personal missions panel (ЛБЗ progress) | same | `FULL_STATS_QUEST_PROGRESS` → full stats on `QUESTS_PROGRESS` → page hides its HUD | hide | the same component as Tab |
| Personal reserves activation | same | `FULL_STATS_PERSONAL_RESERVES` → full stats on `BOOSTERS` → page hides its HUD | hide | same |
| Event stats | event pages, Waffenträger | page shows `eventStats`, hides its HUD | hide | the event modes' Tab |
| Battle loading screen | all | `BATTLE_LOADING`, and the page hides its HUD | hide | always, also with the switch off |
| Frontline respawn screen | Frontline | page shows `epicRespawnView` (RESPAWN state) | hide | replaces the battle view |
| Frontline overview map (M) | Frontline | page shows `epicOverviewMapScreen` | hide | full-screen map |
| Steel Hunter spawn choice | Steel Hunter | page shows `BRSelectRespawn` | hide | full-screen map before the drop |
| Steel Hunter winner screen | Steel Hunter | page shows `battleRoyaleWinnerCongrats` | hide | end screen |
| Waffenträger hunter respawn | Waffenträger | page shows `wtHunterRespawn` | hide | respawn screen |
| Full-screen Gameface windows (story mode prebattle, epilogue and results, Cosmic help) | story mode, Cosmic event | wulf window `WINDOW \| WINDOW_FULLSCREEN` | hide | full screen |
| Stock GUI hidden (V) | all | `GUI_VISIBILITY`, `isGuiVisible()` | hide | always |
| Post-mortem camera on the killer | all | `onPostmortemKillerVisionEnter / Exit` (not followed) | — | the stock HUD stays, and so do our panels (as Battle Observer's and XVM's); the stock elements they replace stay hidden, so the stock battle log never flashes after death |
| Esc menu | all | modal Scaleform view on TOP_WINDOW (10) | — | nobody hides; the menu draws over the page and, by its layer, over our HUD window (7). Live check |
| F1 help, detailed help | all | modal Scaleform views on WINDOW (7) | — | nobody hides; whether it draws over our HUD window (same layer, opened later) is a live check |
| Settings window, confirmation dialogs, Gameface dialogs | all | modal Scaleform views on TOP_WINDOW, wulf `DIALOG` | — | over our window by layer, as over the stock HUD |
| Onslaught vehicle and role choice | Onslaught pre-battle | `prebattleCarouselView` | — | the page does not hide `teamBasesPanel`; no modpack hides for it |
| Radial menu | all | page shows `radialMenu` | — | the page keeps its HUD |
| Chat input | all | messenger focus | — | the page keeps its HUD |
| Enlarged minimap | all | minimap size | — | not an overlay |
| Pre-battle shells panel and its pop-overs | modes with setups, Onslaught skills | `prebattleAmmunitionPanel`, wulf `POP_OVER` | — | sits in the consumables bar's place |
| Post-mortem panel, spectator view | all | `postmortemPanel` | — | the page keeps its HUD (Frontline spectator states hide `teamBasesPanel`, so the panels hide there with the stock HUD) |
| Battle end message | all | game messages panel | — | the page closes with the battle |
| Replay controls | replays | part of the page | — | not an overlay |
| Destroy timer (drowning, overturn) | all | `_destroyTimerToggling` | — | it hides only the hint panel (`page.py:308-317`), not the HUD |
| Tooltips, context menus | all | wulf `TOOLTIP`, `CONTEXT_MENU`, `DROP_DOWN` | — | transient |
| Our own windows (the HUD page, the settings window and its HUD editor) | all | `gui.mods.otmetki.*` classes | — | the editor shows the panels it edits |

## PR: one "battle covered" state

**What changes.** `core/client/hud/cover.CoverWatch` is the one place that decides what covers the battle view; `StockControl` keeps the stock elements our panels replace.

- Four sources report their whole current set of reasons (`core.hud.cover.CoverState`): V, the loading screen, the battle page (`PageOverlays`: the reference component `teamBasesPanel`, then `debugPanel`, then `minimap`, whichever the page has, hidden by a `_setComponentsVisibility` call; or a covering component shown), the full-screen Gameface windows (`WindowWatch`, a rescan of every window on each status change). A reason is on while any source reports it, so stacked overlays never flicker the panels and each one's close takes away only its own reason.
- Every cover hides fully (`full_stats` now hides, new `screen` hides). The `stats` / `modal` fades stay in the layer and the page protocol, unused.
- The overlay keys only schedule a page check a frame later; they never hide by themselves.
- Never stuck: a battle page starts uncovered (the loading screen excepted, it opens before the page) and its dispose uncovers every panel; while anything covers, the watch checks every second (the page's visible components, the windows, `isGuiVisible()`, `isDisposed()`); a snapshot that lists the reference uncovers, a snapshot without it never covers (a page may not have it); a failing layer update uncovers every panel; without the battle page class or the windows manager nothing covers.
- Stock elements follow the layer: `HudLayer.watch(callback)` fires on mute, blocked panels, the battle type and a new cover reason; `releases_stock(panel)` is True while the panel is muted (streamer mode), blocked, left out of the battle type, and `StockControl` gives the panel's stock elements (and reticle parts) back meanwhile. Under Tab, loading, V and the respawn screens the stock HUD is hidden too, so nothing changes there; on the killer camera both stay, so the stock elements stay hidden.
- Setting: `hud_hide_under_windows` in the companion `config.json` (on), «Убирать панели под окнами игры» under «Дополнительно» on the «Данные и сайт» card. Off leaves only V and the loading screen. A new key needs no settings revision: a file without it reads the default.

**Tests.** `core/tests/test_hud_cover_state.py` (the state, the reference mirror, the page tracker, the window rule), `core/tests/test_hud_cover_client.py` (the watch on a stubbed page: Tab, personal missions, event stats, respawn screens, a key the page ignored, stacking, missed closes, page end, the switch, failure), `core/tests/test_hud_cover.py` (hide effects, `releases_stock`, watchers), `core/tests/test_hud_stock_client.py` (a muted panel gives its stock element back). The old cover tests moved out of `test_hud_stock_client.py`.

**Needs a live client.**

1. Tab, the personal missions key and the reserves key hide our panels together with the stock HUD and bring them back on release; Tab over the Esc menu does nothing.
2. The Esc menu and the F1 help draw over our HUD window (layer 7). If the help (same layer) draws under it, hide under the help only.
3. `as_getComponentsVisibilityS()` lists `teamBasesPanel` while the HUD is up (the snapshot uncovers through it).
4. Frontline respawn and overview map, Steel Hunter spawn choice: the panels hide and come back.
5. Streamer mode on: the stock damage log, score strip and sixth sense come back while our panels are muted.
