# Gameface pages inside the Scaleform lobby and battle (inject host)

Status: phases 0-3 are built. The hangar spike was verified in game on RU 1.45 on 2026-10-06 (section 6.1), the
players' hangar page (phase 1) and the battle spike on 2026-10-07. Phase 2 (the battle panels inside the battle
page) and phase 3 (the HUD window and its focus workarounds removed, no fallback window) were built on 2026-10-07
and wait for the owner's in-game check (section 6.3). Phase 4 is not started.

## 1. Problem

Our in-game UI is React built into Gameface pages (`apps/game/modpack/ui-web` → `packages/ui/gameface`). The HUD page
(`hud.html`) is shown by `core/client/hud/gameface` as a separate wulf window: a full-screen, transparent `WindowImpl`
(`HudWindow`, `WindowFlags.WINDOW`, layer `WINDOW`, parent = main window) that stays open for the whole hangar or
battle. Being a window of its own causes our bugs:

- the engine gives it the keyboard focus unasked (1.45 live log: "focus: HudWindow 9"). After that the hangar takes no
  click and the chat takes no key until the game is minimised. `LastFocus`, `FocusReturn` and `_settle_focus` only
  work around this;
- Alt+Tab and chat focus problems, plus a whole-screen input area whenever the page is in edit mode;
- z-order: a wulf window sits above or below the whole Scaleform page. It cannot sit between stock elements, so the
  page fades its panels under Tab and the Esc menu itself (`core.hud.layer` COVER_EFFECTS).

The client has its own way to put a Gameface view inside a Scaleform view. This spec moves our pages onto that
mechanism.

## 2. Findings

Sources: `refs/wot-src-ru` (RU 1.45 decompiled: `sources/res/scripts/client` Python, `sources-as3` AS3), the local
1.45.0.0 client (`D:\Games\Tanki`), `refs/mods/wotstat__wotstat-widgets`.

### 2.1 How the client injects a Gameface view

- Python: `gui/Scaleform/framework/entities/inject_component_adaptor.py`. `InjectComponentAdaptor` is a
  `BaseDAAPIComponent`. In `_populate` it calls `_makeInjectView()`, which must return a `ViewImpl` with
  `ViewFlags.VIEW` (anything else is refused with an error). It then calls
  `mainWindow.content.addChild(view.uniqueID, view, loadImmediately=True)` and `as_setPlaceIdS(view.uniqueID)`. On
  `_dispose` it removes the child and sets the place id back to 0. The page is a **child view of the main window's
  view, not a window**: it has no wulf focus of its own and no layer.
- AS3 (`sources-as3/gui_base/.../containers/inject/`): `GFInjectComponent extends InjectComponent`. The constructor
  adds a wulf `ChildViewProxy`, and `as_setPlaceId` sets `proxy.placeId`. `ChildViewProxy` (`components/wulf/`)
  dispatches a bubbling `wulfChildPlaceAdded` event once it is on stage with a place id. The engine then calls
  `insertWrapper`, which adds a `ViewWrapper` showing the page's texture (`setTexture`) inside the Scaleform display
  list. No Python or AS3 listener exists for that event: it is handled natively, so the proxy works in **any**
  container on stage.
- About 40 stock users: hangar `CrewPanelInject`, `AmmunitionPanelInject`, `DailyQuest`; battle
  `InfoBattleContextHint`, `SixthSenseContextHint`, `BattleNotifier`, `PrebattleAmmunitionPanelView`. Each is a named
  child baked into a stock SWF, with a stock alias registered by the page.

### 2.2 Task 1a: is there a stock host? There is no stock SWF to load, but the stock class needs none

- No stock view or SWF is a generic, empty "inject host". Every `GFInjectComponent` instance belongs to a stock page
  at a stock place. One could register our `ComponentSettings` under a stock alias, but that replaces the stock
  widget (the crew panel, a hint). **Rejected.**
- The class, however, is in `gui_base`, which both the lobby and the battle app load (battle hints extend it).
  Python can create it at runtime, so **no SWF of our own is needed**:
  - `AppEntry` is a DAAPI module whose `flashObject` is the AS3 application root (`framework/application.py`:
    `DAAPIRootBridge._onSWFInited` → `getMember('root')` → `setFlashObject`). `AbstractApplication.utils` is a
    public getter, and `Utils.classFactory.getObject(qualifiedName)` does
    `ApplicationDomain.currentDomain.getDefinition(name)` + `new` (`base_app/.../utils/impl/ClassFactory.as`). So
    `app.flashObject.utils.classFactory.getObject('net.wg.gui.components.containers.inject.GFInjectComponent')`
    returns a fresh component.
  - `parentView.flashObject.addChild(component)` puts it into a loaded Scaleform view. Python already walks AS3 that
    way: `indicators.py` `self.movie.root.dmgIndicator.as_...`, `DAAPIEntity.turnDAAPIon` sets
    `flashObject.script`.
  - `BaseDAAPIComponent.registerFlashComponent(component, alias)` is plain Python: factory lookup by alias,
    `setFlashObject`, `create()`. Calling it ourselves does what the SWF's `registerFlashComponentS` would. Our
    `ComponentSettings(alias, PageInjectAdaptor, DEFAULT_SCOPE)` gives the adaptor, and the parent view's component
    registry disposes it with the view.
  - **UNVERIFIED on Lesta 1.45:** that the Python GFx bridge passes an AS3 object it returned back into an AS3 call
    (`addChild`). That a component registered from Python populates like one registered from AS3. Both are what the
    spike checks first. Every step logs.

### 2.3 Task 1b: the fallback, our own SWF

Needed only if 2.2 fails in the game. Then: one SWF with a `SERVICE_LAYOUT` view in `GLOBAL_SCOPE`, loaded on
`AppLifeCycleEvent.INITIALIZED` for `SF_LOBBY` (parent = main window) and `SF_BATTLE`, exactly like
wotstat-widgets `mod/res/scripts/client/gui/mods/wotstat_widgets/main/MainView.py:558-600`. Its root has `mouseEnabled = false` and one method,
`as_createInject(name)`, which `getDefinitionByName`s `GFInjectComponent`, adds it and calls
`registerFlashComponentS(component, name)`. The same `InjectHost` API stays on top (only `new_inject_component`
changes).

- **Compiler:** Apache Royale's `mxmlc` (what wotstat uses, `mod/as3/README.md`, `build-config.xml`: target-player 17,
  `<targets>SWF</targets>`). It is on npm as `@apache-royale/royale-js-swf@0.9.12` (bin `mxmlc`, last published
  2024-12-07). Its `postinstall` downloads the SWF dependencies, playerglobal included, after a licence prompt. Java
  comes from mise (`java = "temurin-17"`; `mise ls-remote java` timed out here, so this is not tried yet).
- **Libraries:** because `GFInjectComponent` is resolved at run time (`getDefinitionByName` in the app domain), the
  SWF compiles against `playerglobal.swc` only. It needs no Lesta SWC. `playerglobal.swc` is Adobe's: it is
  downloaded by the Royale install or read from a local AIR SDK, and never committed. If typed access to client
  classes is ever wanted, the SWCs are in the client: `res/packages/gui-part1.pkg` → `gui/flash/swc/base_app-1.0-SNAPSHOT.swc`,
  `gui_base-1.0-SNAPSHOT.swc`, `gui_lobby-1.0-SNAPSHOT.swc`, `lobby.swc`; `gui-part2.pkg` → `battle.swc`, `common-*.swc`,
  `common_i18n_library-*.swc`, `gui_battle-*.swc` (checked in the local 1.45.0.0 install). A build script would read
  them from the detected client (`tools/dev/client`) into a gitignored folder.
- **CI:** the built SWF is committed (like `packages/ui/gameface`), so `release.yml` packs it and needs no Java. A
  check could compare its sha256 with a local rebuild, but it is not part of the suite.

### 2.4 Task 1c: input and focus

- Hit-testing is **per view rectangle**. `ViewWrapper` (`gui_base/.../containers/ViewWrapper.as`) is
  `mouseEnabled`, `tabEnabled`, and registered with `App.cursor.registerExternalComponent`. Its `hitArea` is a
  1×1 sprite scaled to the view size minus paddings (`setSize`, `setHitAreaPaddings(top, right, bottom, left)`,
  `updateHitArea`). `BaseWrapper.hitTest(x, y)` tests that sprite's bounds. The texture's transparency plays no part.
- The page can shrink that rectangle: `viewEnv.setInputArea(left, top, width, height)` (ui-web
  `shared/api/gameface/view-env`). `hud.html` already uses it, giving only its buttons outside edit mode
  (`views/hud/model/hooks/use-input-area`). **Verified on RU 1.45 (the spike, 2026-10-06):** for an injected view the engine applies it as the
  wrapper's hit area: in `view` mode, with the Scaleform mouse on, the hangar took clicks under the label.
- The authoritative lever is on the Scaleform side. With `mouseEnabled = false` and `mouseChildren = false` on the
  `GFInjectComponent`, Flash never picks the wrapper as the hit target, so a click goes to the view below. This is
  standard `InteractiveObject` semantics and does not depend on Gameface. The spike's `locked` mode checks it.
- Focus: a wrapper takes the Scaleform focus only when clicked or when its proxy had it (`ChildViewProxy.tryMoveFocus`;
  `insertWrapper` moves focus in only if the proxy itself was focused). With the mouse lever off outside edit mode,
  the battle chat and the hangar keep their focus. There is no wulf window, so there is no wulf focus to steal.
- Battle rule: a panel takes the mouse only while the cursor is shown (Ctrl) **and** the page asks for it (hover
  over a panel, edit). Otherwise `mouseChildren = false`.

### 2.5 Lifetime and visibility come from the parent view

- The component is a child of the parent's display list and of its component registry. When the hangar view is
  destroyed (it is a `SUB_VIEW` replaced by research, the store or the queue: `lobby/hangar/__init__.py`
  `ConditionalViewSettings(VIEW_ALIAS.LOBBY_HANGAR, ..., 'hangar.swf', WindowLayer.SUB_VIEW, ...)`), our adaptor is
  disposed with it. Hangar-only labels therefore need no `plain_hangar` window bookkeeping.
- Battle: the page's children are hidden with the page (V). `battleLoading` (`BaseBattlePage.as:68`) and `fullStats`
  (`random/views/BattlePage.as:97`) are page children, so an inject inserted below them is covered by them, with no
  fade code. The client itself places a GF inject in the page's z-order that way:
  `this.setChildIndex(this.battleNotifier, this.getChildIndex(this.radialMenu) - 1)` (`random/views/BattlePage.as:153`).

## 3. Architecture

- **Host:** `core/client/inject` `InjectHost(alias, layout_key, owner)`. It has `attach(parent_view)` / `detach()`,
  `push(state_text)`, `set_mouse(enabled)` and `move(x, y)`. The owner hears `on_page`, `on_message` and `on_gone`.
  The route is 2.2, with the SWF of 2.3 behind the same API if needed. Pure rules live in `core/inject`.
- **Adaptor and view:** one `PageInjectAdaptor(InjectComponentAdaptor)` class for every alias. Its
  `_makeInjectView` returns `PageView(ViewImpl(ViewSettings(layout, ViewFlags.VIEW, PageViewModel())))`. Layout ids
  come from OpenWG Gameface's `res_id_by_key` on the ui package's res_map (already registered: `otmetki/ui/hud`). No
  new res_map entries means no OpenWG restart for players.
- **Data protocol:** unchanged. One JSON `state` string property plus the `send` command carrying `{message}`, i.e.
  the `HudSurface` v6 protocol, pushed at most once a frame (`FramePush`). Typed ViewModel properties bring nothing
  here: one string a frame is the measured path, and the page already validates it with zod.
- **One host per space first.** Phase 1 keeps `hud.html` exactly as it is, full screen, inside an inject in the hangar
  view (lobby) and in the battle page (battle). The page's own `fitView` sizes the wrapper to the client, and
  `setInputArea` plus `set_mouse` give the input rules. This moves the page out of the window system without
  touching ui-web. Per-widget hosts, each sized to its panel (`resizeViewPx`) and placed by Python
  (`move`, a pure placement function from `x/y/align_*`), are optional (phase 4). They are worth it only to
  interleave single panels with stock elements.
- **Positioning and drag:** stay in the page (as today) while there is one full-screen host. The page sends
  `moved` / `resized`, and the layer writes `components.json`. With per-widget hosts, the page would send the drag
  delta and Python would `move` the component.
- **Edit mode:** hangar: the edit modifier held. Battle: the cursor shown. Both rules are unchanged. While editing,
  `set_mouse(True)` and the page takes its whole area. Outside edit mode, `set_mouse(True)` only if the page has
  clickable panels (the hangar Session card's buttons, tooltips under the battle cursor), else `False`.
- **Show and hide:**
  - Lobby: the host lives in the hangar view, so other lobby screens remove it. Full-screen client windows
    (`FULLSCREEN_WINDOW`, `OVERLAY`) are wulf windows above the Scaleform page and cover it.
  - Battle: the inject sits below `battleLoading`, `fullStats` and `radialMenu`, so loading, Tab and the radial menu
    cover it. V hides it with the page. The Esc menu (`TOP_WINDOW`) is above. The `cover` fades can then go.
- **Settings window:** stays a window, because it is modal, takes the keyboard and closes on Esc. It becomes a
  `LobbyWindow` subclass (`gui/impl/pub/lobby_window.py`: parent = the lobby view's window, not the main window) with
  `WindowFlags.WINDOW | WindowFlags.WINDOW_FULLSCREEN`. Stock precedents: `battle_matters_rewards_view.py:219`,
  `battle_pass_how_to_earn_points_view.py:300`. It is opened from its ModsList row.

## 4. Migration plan

1. **Phase 0, spike (done, verified in game 2026-10-06):** `hud.html` with one label inside the hangar view, dev-only (section 6.1; the spike code is removed).
2. **Phase 1, hangar labels (done 2026-10-07, waiting for the in-game check):** the Gameface backend draws the lobby's
   labels into `hud.html` inside the hangar view (`core/client/hud/hangar_page`, over `InjectHost`), ahead of the
   `HudWindow`, which stays the fallback and still draws the battle. The page attaches to the hangar view on
   `loaderManager.onViewLoaded` (`core/client/inject/watch.ViewWatch`); a re-attach to the same view does nothing and one
   to a reloaded view moves the page. The state and messages are the window's, edit mode included (the edit modifier;
   the settings window's on-screen edit mode and Esc are unchanged). The GFInjectComponent takes the mouse only while
   the player edits. A page that cannot be placed or does not load in 10 s hands the labels to the window for the
   session; the companion switch `hud_inject` («Дополнительно», on) turned it off (removed in phase 3). Kept for now: the labels'
   `plain_hangar` gating (still needed by the window fallback, harmless inside the hangar view), the window's focus
   machinery (battle and fallback). Not done in this phase: the settings window's move to `LobbyWindow`.
3. **Phase 2, battle panels (done 2026-10-07, waiting for the in-game check):** the Gameface backend draws the
   battle panels into a second `hud.html` inside the battle page (`core/client/hud/inject_page` `BATTLE`, alias
   `otmetkiHudBattleInject`). It attaches on the battle app's `onViewLoaded` to every `SharedPage` (the pages the
   stock suppression and the cover watch follow; by the `core.hud.modes` page aliases when the class is missing)
   and goes below `battleLoading`, `fullStats` and `radialMenu`. The state and the messages are the hangar page's;
   only the page of the current GUI space is heard, so a late message of the other page never changes what the
   stock suppression trusts (`drawn`). The mouse lever follows the edit rule of each place: the edit modifier in
   the hangar, the battle cursor in battle (read again when a battle page loads; the cursor poll stays, a cursor
   hidden without an event must take the mouse back). The cover rule keeps hiding the panels for V, the loading
   screen, Tab and the screens that replace the battle view: the page children already cover the page, the panels
   are made invisible too, so a page without those children and the stock elements follow one rule, and every
   reason clears on its own close event, the page's periodic check or the page's end. The fade (`cover` prop,
   `menu` reason) and the watch of full-screen wulf windows are gone: wulf windows draw over the whole battle page.
4. **Phase 3, remove `HudWindow` (done 2026-10-07):** the window backend, its focus machinery (`last_focus`,
   `core.hud.focus`, the wulf focus hand-on), the GUI-space wait for the window, the cover watch of Gameface
   windows, the `cover` fade and the companion switch `hud_inject` (a stored key drops out of `config.json` on the
   next save) are removed, with the dev spikes. Every caller of the window is on the pages now: the hangar labels,
   the battle panels and the settings window's on-screen HUD edit (lobby labels, drawn by the hangar page). The
   settings window and the hit viewer stay full Gameface windows of their own. **Fallback decision:** none. A page
   that cannot be placed (no ClassFactory, an error placing it) or does not load within 10 s is taken out and
   logged, and its panels stay off until its view loads again; the page confirms nothing drawn, so every stock
   element stays, and the player sees the stock HUD. A client without the inject classes has no renderer at all
   (`NullBackend`, logged). A fallback window would bring back the focus bugs this spec removes. Kept: the cursor
   poll (the battle lever needs it), the page's input-area refresh (`HUD_OVERLAY.inputAreaRefreshMs`: the view is
   resized to the client after the first area, inside an inject as in a window), the labels' `plain_hangar`
   gating (the hangar view may stay alive under the queue or another sub view, spec section 5).
5. **Phase 4 (optional):** per-widget hosts where a panel must sit between two stock elements.

## 5. Risks

- The GFx bridge may refuse to pass a returned AS3 object back into `addChild`, or `getObject` may not reach the
  class from the app's domain. The fallback is the own SWF (2.3): one more build step and a committed binary.
- A Python-registered component might not populate (`_isDAAPIInited` false), or the AS3 side might not call
  `as_populate`. The same fallback applies.
- The engine may not apply `setInputArea` to an injected wrapper. The Scaleform lever alone then decides, which costs
  per-panel hover precision: the whole page takes the mouse while it is on.
- The hangar view may sit in the view cache instead of being destroyed. Then the host stays attached while hidden,
  which is harmless. A re-attach is guarded by `attached()`.
- Lesta-specific differences from the WG-era decompile are UNVERIFIED until the spike runs on 1.45.0.0.
- Fair play: nothing changes in what is read or shown. This is only where the same page is drawn.

## 6. Owner test checklist (in game)

### 6.1 Hangar spike (done 2026-10-06)

The owner ran this list on RU 1.45: every item passed (view mode click-through through the page's own input area,
drag in edit, locked click-through, chat and Alt+Tab, leaving and coming back with the hangar view). The log showed
`GFInjectComponent placed (layout 114245)` → `page loaded` → `ready` → drawn, and on leaving the hangar `page destroyed`
→ `adaptor disposed with its parent view`; the page was sometimes placed twice within 3 s as the hangar view reloaded.

The log lines below are the 2026-10-06 build's; the spike now logs `inject spike: lobby view hangar loaded` and
`inject spike: lobby mode ...`, and the watch line is `inject: watching the SF_LOBBY app for hangar`.

Setup:

- [x] Uninstall the modpack in the manager. The dev loop refuses to install next to it.
- [x] `cd apps/game/modpack && bun run dev:install`.
- [x] Create the empty file `<client>\mods\configs\otmetki\inject_spike.flag`.
- [x] Start the game and run `bun run dev:log` in a terminal.

python.log, in order:

- [x] `inject spike: on`
- [x] `inject spike: watching the lobby app for the hangar view`
- [x] `inject spike: hangar view loaded`
- [x] `inject otmetkiInjectSpike: GFInjectComponent placed in hangar (layout N)`
- [x] `inject otmetkiInjectSpike: page loaded`
- [x] `inject spike: page says {"type":"ready"}`
- [x] `inject spike: mode view ...`

Failure lines to copy back if they appear:

- `the app ... has no AS3 ClassFactory`
- `error in inject otmetkiInjectSpike: placing the GFInjectComponent` and its traceback
- `no layout for otmetki/ui/hud`

In the hangar:

- [x] The label `Tri otmetki inject spike | view | HH:MM:SS` is drawn at top left (about 40, 160) and its clock ticks
  every second. This checks the state path.
- [x] `view` mode: everything under and around the label takes clicks: the carousel, the buttons, rotating the tank
  with the mouse. This checks that `setInputArea` reaches the wrapper.
- [x] Ctrl+Alt+I → `edit`: the label shows a frame and drags with the mouse. On release, a `moved` line is logged and
  the label stays in place. The rest of the hangar no longer takes clicks: expected, the page takes its whole area.
- [x] Ctrl+Alt+I → `locked`: the label can no longer be dragged and the hangar takes clicks again. This checks the
  Scaleform lever.
- [x] Ctrl+Alt+I → back to `view`.
- [x] Focus: open the lobby chat or a text field, type, and click the label area. Typing still goes to the field.
  Alt+Tab out and back: the hangar still takes clicks and keys.
- [x] Open research or the store: `adaptor disposed with its parent view` and `the page is gone` are logged and the
  label is gone. Back in the hangar, `hangar view loaded` and `placed` are logged again and the label is back.
- [x] Enter a battle and come back: no errors, and the label returns in the hangar.
- [x] Cleanup: delete the flag file, run `bun run dev:uninstall`, and reinstall through the manager.

### 6.2 Phase 1: the players' hangar page (no flag)

Setup: uninstall the modpack in the manager, `cd apps/game/modpack && bun run dev:install`, make sure
`mods/configs/otmetki/inject_spike.flag` does not exist, start the game, `bun run dev:log`.

python.log, in order:

- [ ] `HUD renderer: gameface`
- [ ] `HUD: the hangar panels are drawn inside the hangar view`
- [ ] `inject: watching the SF_LOBBY app for hangar`
- [ ] `inject otmetkiHudInject: GFInjectComponent placed in hangar (layout N)`
- [ ] `inject otmetkiHudInject: page loaded`
- [ ] `HUD: Gameface page ready in the hangar view (N labels: ...)`
- [ ] no `Gameface window` line at all (there is no HUD window since phase 3).

Failure lines to copy back: `HUD: the page could not be placed in the hangar view, ...` or `... did not load in 10 s ...`,
`error in inject otmetkiHudInject` and its traceback, `the client has no inject adaptor`.

In the hangar:

- [ ] Every hangar card is where it was: Tank card, Session card, the clock and server line, the other hangar cards.
- [ ] Without the edit modifier: the carousel, the buttons, rotating the tank and the chat all work, also right over a
  card.
- [ ] Hold Alt (or the key set in «Клавиша перемещения панелей в ангаре»): the cards are framed and drag; the wheel
  resizes. Release: the new place stays after a hangar reload and a client restart.
- [ ] Settings window → «Расположение панелей» → «На экране»: the previews show in the hangar and drag with Alt; Esc
  ends it, the previews go.
- [ ] Open research or the store and come back: the cards go and come back (`page destroyed`, `adaptor disposed`,
  `placed`, `page loaded` in the log), no error.
- [ ] Alt+Tab out and back, type in the lobby chat: keys and clicks still reach the hangar.
- [ ] Battle and back: the battle panels draw inside the battle page (6.3), the hangar cards come back in the
  hangar view and no window opens anywhere.

### 6.3 Phase 2 and 3: the battle panels inside the battle page (no window)

Setup: uninstall the modpack in the manager, `cd apps/game/modpack && bun run dev:install`, start the game,
`bun run dev:log`. Delete `mods/configs/otmetki/inject_spike.flag` if it is still there (nothing reads it now).

python.log, in order:

- [ ] `HUD renderer: gameface`
- [ ] `HUD: the panels are drawn inside the hangar view and the battle page`
- [ ] in the hangar, the 6.2 lines (`inject otmetkiHudInject: ...`, `HUD: Gameface page ready in the hangar view`)
- [ ] in battle: `inject: watching the SF_BATTLE app for StoryModeBattlePage, battleRoyalePage, ...` (once per
  battle app)
- [ ] `inject otmetkiHudBattleInject: GFInjectComponent placed in classicBattlePage (layout N)`
- [ ] `HUD: the page went below battleLoading/fullStats/radialMenu in the battle page (index N)` (N a number, not
  None)
- [ ] `inject otmetkiHudBattleInject: page loaded`, `HUD: Gameface page ready in the battle page (N labels: ...)`
- [ ] `HUD: the page draws hud.damage_log, ... for the first time`, then `HUD: stock ['battleDamageLogPanel', ...]
  hidden, - restored (...)`
- [ ] with Ctrl: `HUD: battle cursor shown, panels can be dragged`, `HUD: the page saw the mouse in edit mode
  (hover, battle)`
- [ ] after the battle: `inject otmetkiHudBattleInject: page destroyed`, `... adaptor disposed with its parent view`
- [ ] never: `Gameface window`, `took the focus`, `error in`.

Failure lines to copy back: `HUD: the page could not be placed in the battle page, its panels stay off ...`,
`HUD: the page placed in the battle page did not load in 10 s ...`, `error in inject otmetkiHudBattleInject` with its
traceback, `index None`, `the client has no inject adaptor for the HUD page`.

In a random battle:

- [ ] Every battle panel is where it was before (damage log, marks, battle progress, team HP at the stock score
  strip, the equipment row beside the consumables, the platoon points, the gun arc), at 100 % and at another
  interface scale.
- [ ] The stock score strip, damage log and sixth-sense lamp stay hidden while ours draw, through Tab, V, sniper and
  arcade switches and after death; switching a component off mid-battle brings its stock element back at once.
- [ ] The crosshair readouts (reload box, zoom, arcs) draw at the reticle and the stock parts they replace are hidden;
  the sixth-sense lamp lights with the stock one.
- [ ] During the loading screen the panels are under it; Tab: the statistics cover them and they come back on
  release; the radial menu draws over them; V hides them with the HUD and V brings them back; the Esc menu draws
  over them.
- [ ] Without Ctrl: WASD, the mouse aim, shooting and the mouse camera are unaffected, also right over a panel.
- [ ] Ctrl: the panels are framed, drag and resize with the wheel; the minimap and the team lists next to them
  still take clicks; release Ctrl: no panel keeps the mouse. A dragged panel is in its new place next battle.
- [ ] The battle chat (Enter) types normally, before and after a drag; Alt+Tab out and back: controls, chat and Ctrl
  still work.
- [ ] Frontline, Onslaught, ranked and an event battle: the panels draw (the page names its alias in the `placed`
  line), and Frontline's respawn screen and overview map hide them.
- [ ] Back in the hangar: the cards come back, no error in the log.
- [ ] Settings window → «Расположение панелей» → «На экране» in the hangar: the previews show and drag with Alt;
  Esc ends it.

## 7. Implementation

- `packages/core/inject/` (pure): `GF_INJECT_CLASS`, the page protocol names, `below_covers`, `valid_layout`,
  `message_of`, the aliases, `BATTLE_COVERS` and the load timeout. Tests in `packages/core/tests/test_inject.py`.
- `packages/core/client/inject/`: `InjectHost` (`attach`, `detach`, `push`, `set_mouse`, `move`, `place_below`),
  `page.py` (`PageViewModel`, `PageView`, `PageInjectAdaptor`, `bind`, `page_layout`, `page_usable`), `watch.py`
  (`ViewWatch`: an app's views by alias or by a `matches(view)` rule).
- `packages/core/client/hud/inject_page/`: `PagePlace` (`HANGAR`, `BATTLE`), `InjectPage` (one place's page:
  attach, the place under the covers, the load check), `is_battle_page`.
- `packages/core/client/hud/gameface/`: `GamefaceBackend` over the two pages (the page of the current GUI space,
  the mouse lever per place, the cursor, `drawn`).
- Tests: `packages/core/tests/test_hud_gameface_space.py` and `test_hud_gameface_window.py` (the backend over fake
  pages); `tools/testing/_scaleform.py` stubs the Scaleform side (apps, ClassFactory, views, the adaptor and a
  `SharedPage` battle page); `tools/tests/test_client_smoke.py` (`GamefaceBackendTest`, `Inject*Test`,
  `HudWithoutInjectTest`) and `test_ui_smoke.py` play the hangar page, the battle page, the failures and a client
  without the inject classes.
