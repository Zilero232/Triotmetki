# Gameface pages inside the Scaleform lobby and battle (inject host)

Status: research done and spike built 2026-10-06. The spike is dev-only and does not change what players get. Phases 1-3 are not started.

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
  (`views/hud/model/hooks/use-input-area`). **UNVERIFIED:** that for an injected view the engine applies it as the
  wrapper's hit-area paddings. The spike's `view` mode checks it.
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

1. **Phase 0, spike (done here):** `hud.html` with one label inside the hangar view, dev-only (section 7).
2. **Phase 1, hangar labels:** a `HudBackend` named `inject` over `InjectHost`, first in the chain, with `HudWindow`
   kept as the fallback. In the lobby it attaches to the hangar view on `loaderManager.onViewLoaded`. The labels'
   `plain_hangar` gating becomes "the hangar view exists". The settings window moves to `LobbyWindow`.
3. **Phase 2, battle panels:** the host attaches to the battle page (`VIEW_ALIAS.CLASSIC_BATTLE_PAGE` and the other
   page aliases `hud_layouts` knows). It is inserted below `battleLoading`, `fullStats` and `radialMenu`. The mouse
   lever follows the cursor events the backend already hears. The fades of `core.hud.cover` are retired where the
   z-order covers.
4. **Phase 3, remove `HudWindow`:** delete the window backend's focus machinery (`last_focus`, `core.hud.focus`,
   `FocusReturn`, `CURSOR_POLL_S` polling only kept if the battle lever still needs it) and the cover windows.
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

Setup:

- [ ] Uninstall the modpack in the manager. The dev loop refuses to install next to it.
- [ ] `cd apps/game/modpack && bun run dev:install`.
- [ ] Create the empty file `<client>\mods\configs\otmetki\inject_spike.flag`.
- [ ] Start the game and run `bun run dev:log` in a terminal.

python.log, in order:

- [ ] `inject spike: on`
- [ ] `inject spike: watching the lobby app for the hangar view`
- [ ] `inject spike: hangar view loaded`
- [ ] `inject otmetkiInjectSpike: GFInjectComponent placed in hangar (layout N)`
- [ ] `inject otmetkiInjectSpike: page loaded`
- [ ] `inject spike: page says {"type":"ready"}`
- [ ] `inject spike: mode view ...`

Failure lines to copy back if they appear:

- `the app ... has no AS3 ClassFactory`
- `error in inject otmetkiInjectSpike: placing the GFInjectComponent` and its traceback
- `no layout for otmetki/ui/hud`

In the hangar:

- [ ] The label `Tri otmetki inject spike | view | HH:MM:SS` is drawn at top left (about 40, 160) and its clock ticks
  every second. This checks the state path.
- [ ] `view` mode: everything under and around the label takes clicks: the carousel, the buttons, rotating the tank
  with the mouse. This checks that `setInputArea` reaches the wrapper.
- [ ] Ctrl+Alt+I → `edit`: the label shows a frame and drags with the mouse. On release, a `moved` line is logged and
  the label stays in place. The rest of the hangar no longer takes clicks: expected, the page takes its whole area.
- [ ] Ctrl+Alt+I → `locked`: the label can no longer be dragged and the hangar takes clicks again. This checks the
  Scaleform lever.
- [ ] Ctrl+Alt+I → back to `view`.
- [ ] Focus: open the lobby chat or a text field, type, and click the label area. Typing still goes to the field.
  Alt+Tab out and back: the hangar still takes clicks and keys.
- [ ] Open research or the store: `adaptor disposed with its parent view` and `the page is gone` are logged and the
  label is gone. Back in the hangar, `hangar view loaded` and `placed` are logged again and the label is back.
- [ ] Enter a battle and come back: no errors, and the label returns in the hangar.
- [ ] Cleanup: delete the flag file, run `bun run dev:uninstall`, and reinstall through the manager.

## 7. Spike

- `packages/core/inject/` (pure): `GF_INJECT_CLASS`, the page protocol names, `spike_enabled`, `valid_layout`,
  `message_of`, `SpikeMode`, `spike_text`. Tests in `packages/core/tests/test_inject.py`.
- `packages/core/client/inject/`: `InjectHost` (`__init__`), `page.py` (`PageViewModel`, `PageView`,
  `PageInjectAdaptor`, `bind`, `page_layout`), `spike.py` (`InjectSpike`, `start(dev)`).
- Start: `packages/ui/entry/mod_otmetki_ui.py` calls `core.client.inject.spike.start(is_dev_install())` in its own
  `try`. It runs only in a dev install (the `otmetki-dev` manifest, or `OTMETKI_DEV=1`) **and** with
  `OTMETKI_INJECT_SPIKE=1` or `mods/configs/otmetki/inject_spike.flag`. A player's install never starts it.
- The spike embeds `hud.html` (`otmetki/ui/hud`, already registered), so there is no new page, res_map entry or
  ui-web build. Its state is a `HudSurface` with one lobby label: `edit` follows the mode, and `cursor` is always true
  in the hangar.
