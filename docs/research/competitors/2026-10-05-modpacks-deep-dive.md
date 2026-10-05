# How the established modpacks actually behave: a source-level deep dive (research 2026-10-05)

The player's complaint is that our modpack keeps inventing behaviour where every other pack does the same thing in the
same way. This note is the second, source-level pass. It reads the code of Battle Observer, XVM (Lesta build), kurzdor's
mods, izeberg's ModsSettingsAPI, poliroid's ModsList and BattleHits, wotstat widgets and docs, OpenWG Gameface/Common
and the stock RU 1.45 client, plus the settings and positions other packs left on the player's machine. It is meant as
ground truth for the work running now: hiding stock elements, hiding our panels under game overlays, and the panels
that sit in the wrong place on battle entry until Ctrl is pressed.

It does not repeat [behaviour parity](2026-10-05-behavior-parity.md), [stock replacement](2026-10-05-stock-replacement.md),
[the code study](2026-09-30-modpacks-code.md), [round 3](2026-09-29-modpacks-round3.md), [round 4](2026-09-30-round4.md) or
the [competitor UI brief](../design/2026-10-03-competitor-ui.md). Where this note contradicts one of them, the
contradiction is marked **⚠ contradicts**.

## 0. Sources

| Source | Version read | Where |
| --- | --- | --- |
| Battle Observer (Armagomen) | `aa95fc4`, 2026-10-05 | github.com/Armagomen/battle_observer |
| XVM (Lesta and WG flavours) | `929a79f`, 2026-10-01 | gitlab.com/xvm/xvm (`src/`, `release/configs/default_lesta/`) |
| kurzdor mods (battleequipment 3.12.01, advancedpersonalefficiency 1.4.9) | `a78b871`, 2026-09-24 | github.com/Kurzdor/wotmods-public (zips with configs and changelogs; the Python code is PjOrion-protected) |
| ModsSettingsAPI (izeberg) | `463416e`, 2026-09-20 | github.com/izeberg/modssettingsapi |
| ModsList, BattleHits (poliroid) | `7cff04f`, `6ed4c2b`, 2026-09-21 | gitlab.com/wot-public-mods/mods-list, …/battle-hits (local copies in `D:\Project\personal\refs\mods`) |
| wotstat widgets | `891ec73`, 2026-01-17 | github.com/wotstat/wotstat-widgets (local copy) |
| wotstat modding docs | `3f53ba5`, 2026-08-31 | github.com/wotstat/mods-development-docs (`docs/ru/guide/...`) |
| OpenWG Gameface 1.2.x, OpenWG Common | `ca0d872`, `580f36b` | gitlab.com/openwg/wot.gameface, …/wot.common (local copies) |
| Stock client RU 1.45 (Python and AS3) | — | `D:\Project\personal\refs\wot-src-ru\sources`, `…\sources-as3`, `…\client-1.45-extract` |
| The player's machine | 2026-10-05 | `%APPDATA%\Lesta\MirTankov\mods\` (`modsettings.dat`, `gunmarks\*.json`, `lebwa\statshistory.json`, `pmod\statistic.json`, `battlehits\`), `D:\Games\Tanki\mods\1.45.0.0\` (only our packages and their dependencies are installed now) |
| Web | 2026-10-05 | joves-modpack.ru/faq, tankist.net/interface/pmod |

Not re-downloaded: the Jove, Lebwa and Near_You installers (their extraction from the code study is gone; their
behaviour is taken from the code study, the MSA templates and saved configs the player's previous install left behind).
Aslain still needs a logged-in browser.

Paths below: `BO/` = `mod/res/scripts/client/armagomen/battle_observer/` in Battle Observer, `BO-as/` =
`as/src/net/armagomen/battle_observer/`, `XVM/` = `src/` in XVM, `XVM-as/` = `src/xvm_actionscript/swf_xvm/`,
`stock/` = `refs/wot-src-ru/sources/res/scripts/client/`, `stock-as/` = `refs/wot-src-ru/sources-as3/gui_battle/scripts/`.

---

## ⚑ Findings that affect the three running changes (read first)

### F1. The stock client already shows the previous battle's result in battle — `battleNotifier`

**⚠ contradicts** [behaviour parity §1.2](2026-10-05-behavior-parity.md) («right side, above the minimap»).

- `stock/gui/battle_control/controllers/battle_notifier_ctrl.py:41-44`: during a battle, a service-channel message of
  type 2 (battle results) is forwarded to the `battleNotifier` page component until `onRoundFinished`.
- `stock/gui/Scaleform/daapi/view/battle/shared/battle_notifier.py:33-56`: it is an `InjectComponentAdaptor` hosting
  the Gameface `BattleNotifierView`; it exists only when the server enables it
  (`helpers/server_settings.py:2878` `isBattleNotifierEnabled`) **and** the game option `GAME.ENABLE_BATTLE_NOTIFIER`
  is on (default `True`, `account_helpers/settings_core/migrations.py:575`).
- What it shows (`gui/impl/gen/view_models/views/battle/battle_notifier/battle_notifier_view_model.py:70-81`): result,
  battle start time, map, vehicle name, tier and class, credits, XP, bonds.
- Where (`stock-as/net/wg/gui/battle/views/battleNotifier/BattleNotifier.as:13-19, 55-62`, placed in
  `random/views/BattlePage.as:150-153, 244-246`): a 292×283 block at y 365 (y 186 when the stage is ≤ 960 px high),
  just under the radial menu in z-order; the Gameface CSS slides it in from the **left** edge (`left: -292rem`
  keyframes) and fades it out after about 4 s (`BattleNotifierView.css`, `App_slideOut`, `animation: … 4s`).
- It is a registered page component, so the stock page hides it with every overlay.

Consequence: our `LastBattlePanel` (battle_results) is a **duplicate of a stock element**, which the project's own rule
forbids. Two compliant options:

1. Retire our card and leave the stock notifier (zero code; the convention).
2. Keep ours only as a replacement: add `battleNotifier` to battle_results' `stock_aliases()` so the stock one is hidden
   while ours runs, and put ours where the stock one is (left, y 365 / 186), not where nobody has it.

Live check before deciding: does Lesta's server enable it (`lobbyContext.getServerSettings().isBattleNotifierEnabled()`
in a debug log line)? If it is off on Lesta, our card fills a real gap, and its place is still the stock one.

### F2. The convention for "hide under overlays" is: follow the stock page's own component visibility, not raw key events

This is ground truth for the overlay-hiding change.

- **Battle Observer** registers every panel as a **component of the stock battle page**: `BO-as/BattleObserverLibraryMain.as:37-63`
  (`registerComponent(addChild(new UI()), alias)`) and `BO/battle/__init__.py:87-89` (`view._blToggling.update(components)`).
  The stock page then hides them with everything else, because each overlay hides the set
  `as_getComponentsVisibility()` returns, which is every registered visible component
  (`stock-as/net/wg/gui/battle/views/BaseBattlePage.as:379-392, 535-550`):
  - Tab, quest progress (ЛБЗ) and personal reserves are one method, `ClassicPage._toggleFullStats`
    (`stock/gui/Scaleform/daapi/view/battle/classic/page.py:114-152`), fed by `FULL_STATS`,
    `FULL_STATS_QUEST_PROGRESS` and `FULL_STATS_PERSONAL_RESERVES` (lines 203-210);
  - the battle loading screen (`shared/page.py:277-300`, `_blToggling`);
  - the destroy timer (drowning, overturn) (`shared/page.py:308-317`, `_destroyTimerToggling`).
- **XVM** draws its battle labels as plain children of the page and copies the visibility of one stock component:
  `XVM-as/xvm_battle/com/xvm/battle/shared/teamBasesPanel/UI_teamBasesPanel.as:77-81` re-broadcasts
  `teamBasesPanel.setCompVisible(value)`; `BattleLabels.as:34, 143-146` and the zoom indicator set `visible` from it;
  their initial visibility comes from the debug panel's (`BattleXvmView.as:155-162`).
- **wotstat widgets** (an overlay above the page, not a page component) listen to the three events:
  `main/MainView.py:87-89, 184-185` (`FULL_STATS`, `FULL_STATS_QUEST_PROGRESS`, `FULL_STATS_PERSONAL_RESERVES`,
  `ctx['isDown']`).

What to copy: our wrapper of `SharedPage._setComponentsVisibility` (`packages/core/client/hud/stock/__init__.py:84-88`)
already sees every call. The XVM technique costs a few lines there:

- hide our battle panels when a **reference alias we never suppress** (XVM uses `teamBasesPanel`; fall back to
  `debugPanel`, then `minimap`) is in `hidden`;
- show them again when it is back in `visible`.

That covers Tab, ЛБЗ, reserves, loading and the destroy timer with one rule, in the stock order, and nothing is missed
when Lesta adds a tab. Raw events are second best: `_toggleFullStats` returns early when a modal view exists, the radial
menu is open, or the tab is unknown (lines 116-129). An event listener then hides our panels while the stock HUD stays
on screen. Today we listen to `FULL_STATS` only (`stock/__init__.py:213-218`), so ЛБЗ and reserves are missed.

### F3. Under the Esc menu nobody hides anything

The stock Esc menu (`INGAME_MENU`) is a modal **TOP_WINDOW** (layer 10). The battle page lives on VIEW (4) and stays
drawn, dimmed, under it. BO and XVM panels are page children, so they behave the same. wotstat widgets sit on
SERVICE_LAYOUT (13, `MainView.py:565`) and therefore show **above** the Esc menu. Players accept that, but it is the
outlier.

For the overlay change this means: hiding (or fading) our panels under the Esc menu or F1 help is not a convention. It is
correct only as a workaround if our Gameface window (`WindowLayer.WINDOW`, 7) turns out to draw above the TOP_WINDOW
menu on Lesta (`core/client/hud/gameface/constants.py` notes this as UNVERIFIED). Verify the z-order live first; if the
menu covers our window, do nothing under Esc.

### F4. Postmortem, the countdown setup panel and the video camera hide specific stock elements; panels tied to them follow

- On death the stock page hides the consumables panel (`shared/page.py:348-351`). kurzdor's equipment row hides with it
  (battleequipment CHANGELOG 3.5.0: «panel was visible after reconnection when player died» fixed). Battle Observer's
  lamp hides on `DESTROYED`/`CREW_DEACTIVATED`/`SWITCHING` and on round end (`BO/battle/sixth_sense.py:11-13, 93-97, 144-151`).
- During the countdown the stock pre-battle setup panel (`PREBATTLE_AMMUNITION_PANEL`) takes the consumables area.
  kurzdor hides the row then (CHANGELOG 3.10.00 «Hide panel while prebattle highlights screen is open»).
- The video camera hides damage panel, damage log and consumables (`classic/page.py:268-283`).

Copy: give each own-vehicle panel a "follow this stock alias" link in the same `_setComponentsVisibility` wrapper:

- `battle_loadout` follows `consumablesPanel` (hidden in postmortem, in the countdown setup screen and in the video
  camera);
- the damage-log replacement follows `battleDamageLogPanel`'s requested visibility;
- `sixth_sense` hides on death, as Battle Observer's does.

### F5. Panels misplaced on battle entry until Ctrl: what the others do to get the first layout right

- **Battle Observer and XVM** compute every position from `App.appWidth/appHeight` when the component is populated. They
  then **force a re-layout** of the page right after injecting:
  - `BO-as/BattleObserverLibraryMain.as:61` `this.updateStage(App.appWidth, App.appHeight)`;
  - `XVM-as/xvm_battle/com/xvm/battle/BattleXvmView.as:213-223` `battlePage.updateStage(...)` on config load.

  They re-position on `Event.RESIZE` (`BO-as/battle/base/ObserverBattleDisplayable.as:19, 56`, e.g.
  `maingun/MainGunUI.as:58-60, 131-133`) and on the Python hook of the app's stage update
  (`XVM/xvm_main/handlers.py:46-48`, `@registerEvent(AppEntry, 'as_updateStageS')` →
  `AS_ON_UPDATE_STAGE`). The stock caller is `AppEntry.updateStage(w, h, scale)`
  (`stock/gui/Scaleform/framework/application.py:406-407`), fired by the interface-scale setting.
- **Gameface pages** (OpenWG's own helper, `wot.gameface/resources/in/gui/gameface/mods/libs/media.js:97-172`) read the
  size and scale only after `engine.whenReady` (`viewEnv.getClientSizePx()`, scale = `viewEnv.remToPx(1)`). They then
  subscribe to `engine.on('clientResized', w, h)` and `engine.on('self.onScaleUpdated', scale)`. wotstat's docs teach
  the same two events (`docs/ru/guide/scripting/gameface-theory/index.md:386-410`). wotstat widgets also hook
  `settingsCore.interfaceScale.onScaleChanged` in Python (`main/MainView.py:101`, `CefServer.py:162-164`).
- **Ours** (`ui-web/src/views/hud/model/hooks/use-hud-screen/use-hud-screen.ts`):
  - the first screen comes from `readScreen()` in the `useState` initialiser, before `engine.whenReady`;
  - the scale comes from `getComputedStyle(document.documentElement).fontSize`
    (`shared/lib/design-screen/design-screen.ts`), not from `viewEnv.remToPx(1)`;
  - it is re-checked by a 1 s poll plus `window.resize`, and the poll compares only width and height;
  - `fitView()` (`resizeViewPx`) runs only when that comparison changes.

  Any of these can leave the first layout on the fallback screen or a scale of 1 until something else re-renders the
  page (the cursor state Ctrl toggles is such a trigger).

  The fix that copies the convention:
  1. measure on `engine.whenReady`;
  2. subscribe to `clientResized` and `self.onScaleUpdated`;
  3. take the scale from `viewEnv.remToPx(1)`;
  4. call `fitView()` unconditionally on ready and on each of those events;
  5. optionally have Python push `(w, h, scale)` from `AppEntry.updateStage` into the state (the XVM hook), so the page
     never guesses.

### F6. Hiding stock elements: our mechanism matches the convention; two additions

[Stock replacement](2026-10-05-stock-replacement.md) is consistent with the sources:

- Battle Observer removes the stock child for the battle (`BO-as/battle/base/ObserverBattleDisplayable.as:64-74`
  `hideComponent`, used for `sixthSense`, `battleTimer`, `teamBasesPanel`, `debugPanel`);
- XVM switches the stock damage-log parts off by config (`release/configs/default_lesta/damageLog.xc:61-67`,
  `disabledDetailStats: true`, `disabledSummaryStats: true` **by default**);
- ours filters the page's own visibility calls, which is reversible within the battle. That is better, not different.

Two things the others do that we don't:

1. **Step back when another pack owns the element.** Battle Observer turns its minimap, statistics, players panels and
   coloured icons off when XVM is installed (`BO/shared/battle/view_settings.py:165-168, 198-218`,
   `IS_XVM_INSTALLED`). We should do the same: no team_hp replacement when BO's or pmod's HP bar is present, and no
   damage-log replacement when XVM's `damageLog` is enabled. Today both packs' elements would draw on top of ours.
2. **Per battle type.** BO enables main gun only in random/mapbox, HP bars and logs not in special battles
   (`view_settings.py:187-196`). Our `hud_layouts` already does this.

---

## 1. In-battle panel lifecycle

| Step | Battle Observer | XVM | kurzdor, protanki, Lebwa, Near_You (Scaleform, protected Python; from AS3 and configs) | wotstat widgets | Stock | Ours |
| --- | --- | --- | --- | --- | --- | --- |
| Created when | the battle page's view-loaded event for every battle page alias (`BO/battle/__init__.py:64-103`), retried every 0.1 s up to 80 times until the page's flash object has the injected method | `onAfterPopulate` of the battle page (`BattleXvmView.as:119-170`) | page populate; positions from the panel's live neighbour (code study §1) | MainView populate, once per GUI space (`MainView.py:77-110`) | page `configUI` → `updateStage` (`BaseBattlePage.as:220-222`) | Gameface window opened a frame after the battle space is entered (`core/client/hud/gameface/__init__.py`) |
| Hidden during loading | yes, added to `_blToggling` (`BO/battle/__init__.py:88`) | follows `teamBasesPanel` | yes (page components) | not handled | yes | yes (`BATTLE_LOADING` event) |
| First position | `App.appWidth >> 1` + config offset at populate (`MainGunUI.as:58-60`), page re-laid out at once (`BattleObserverLibraryMain.as:61`) | `screenHAlign/screenVAlign` + x/y per label (`battleLabelsTemplates.xc`, `doc/extra-field.txt:42-44`) | offset from an anchor; kurzdor reads the consumables panel's live width | stored x/y per widget, per hangar/battle and per control mode | — | anchor + offset, measured by the page (F5) |
| Resolution / scale change | `Event.RESIZE` → `onResizeHandle` | `AS_ON_UPDATE_STAGE` from `AppEntry.as_updateStageS` | `Event.RESIZE` / `ConsumablesPanelEvent.UPDATE_POSITION` (code study §1) | `interfaceScale.onScaleChanged` | `updateStage(w, h)` | 1 s poll (F5) |
| Tab / ЛБЗ / reserves | hidden (page components) | hidden (mirrors `teamBasesPanel`) | hidden (page components) | hidden on the three events | hidden (`_fsToggling`) | faded to ¼ on `FULL_STATS` only; ЛБЗ and reserves missed (F2) |
| V (hide GUI) | hidden (page container hidden) | hidden | hidden | not handled | `_toggleGuiVisible` hides the VIEW container (`shared/page.py:188-195`) | hidden (`GUI_VISIBILITY`) |
| Esc / F1 | stays under the modal menu | same | same | **above** the menu (SERVICE_LAYOUT) | page stays under the TOP_WINDOW menu | faded (F3) |
| Death | per panel: lamp hides (`sixth_sense.py:144-151`) | per label (macros) | equipment row hides | — | consumables hidden (`shared/page.py:348-351`) | not linked (F4) |
| Battle end | lamp and timers stop on `onRoundFinished` | — | — | — | page disposed on exit | page disposed on exit |
| Stock element they replace | `hideComponent` (remove the stock child) | config switches (`disabledDetailStats`) | Near_You swaps `sixthSense.swf` | — | — | `_setComponentsVisibility` filter (F6) |
| Restore on disable | toggled overrides (`toggleOverride(..., enabled)` in `components/service_channel_filter.py:40-46`); battle panels come back on the next battle | next battle | next battle | — | — | at once (better) |

Note on mouse handling: BO components are `mouseEnabled = false`, `mouseChildren = false`
(`ObserverBattleDisplayable.as:22-30`); only panels that can be dragged take the mouse, and only with the Ctrl cursor
(§2).

## 2. Drag and edit

| Who | How the player moves a panel | Stored where, in what units | Default per resolution |
| --- | --- | --- | --- |
| Battle Observer | **not draggable**; x/y offsets in the settings (MSA sliders or `mods/configs/mod_battle_observer/<profile>/*.json`), e.g. `main_gun.json` `x 260, y 0` from the screen centre, `log_total.json` `x −260, inCenter` | JSON per component, design px from an anchor (centre/right) | one offset, re-anchored to centre/right at every size |
| XVM | not draggable by default (`damageLog.xc:71-77`, `"moveInBattle": false`); with `true`, Ctrl-cursor drag via the label's `mouseEvents` | config x/y, `screenHAlign/VAlign` | one offset per alignment |
| kurzdor battleequipment | position option **left / right of the consumables panel / free**; only «Свободная» allows drag-n-drop inside the screen (MSA tooltip, player's `modsettings.dat`; CHANGELOG «Added ability to drag panel in screen bounds under 'Free' position setting») | `mods/configs/kurzdor/battleequipment/config.json`: `position`, `offset [0,0]`, `minimized`, `mode always/onKey`, `hotkey [[56,184]]` (Alt) | follows the consumables panel's live width |
| protanki / Near_You «gunmarks» | drag anywhere (MSA tooltip «панель можно передвигать по экрану»), minimise button right of the panel; **anchor point** chosen in settings: centre, top-left, top-right, bottom-left, bottom-right | `%APPDATA%\…\mods\gunmarks\protanki_config.json`: `anchorPoint: center`, `offsetBattle [376, 472]`, `battleMinimized`, `alwaysAlternate` | offset from the chosen anchor |
| Lebwa | Ctrl-cursor drag (code study §2) | `%APPDATA%\…\mods\lebwa\statshistory.json`: per panel (`gunmarks`, `artillery`, `onslaught`) `offset [x, y]` where **`[0, 0]` = the default place**, `minimized`, `always_alternate`, `always_colorblind`; hangar `panel_offset`, `window_offset` | default anchor + offset |
| wotstat widgets | drag with the cursor (Ctrl in battle) and a context menu (lock, hide, layer, position mode) | per widget: hangar and battle positions, optionally **separate positions for sniper / strategic / arty** (`WidgetStorage.py:70-72`, `MainView.py:241-292`) | stored px |
| Ours | Ctrl-cursor drag in battle, the HUD editor in the hangar | `mods/configs/otmetki/components.json` x/y (+ anchor), per battle type (`ModePlaces`) | dock anchors + offsets |

Take from it:

- An offset of `[0, 0]` means the default place (Lebwa, kurzdor). A «reset position» is then just zeroing, and the
  default can move in a later version without breaking saved offsets.
- An explicit **anchor choice** per panel (gunmarks' five anchors). This is a better answer to «panels jump at another
  resolution» than free px.
- A **minimise** button and a persisted `minimized` flag on the big panels (marks: protanki, Lebwa).
- A per-panel «always alternate» toggle (Lebwa, protanki) next to the Alt-hold mode.

## 3. Settings UX, hotkeys, defaults

| | Battle Observer | XVM | kurzdor, protanki, Lebwa | PMOD | Ours |
| --- | --- | --- | --- | --- | --- |
| Window | ModsSettingsAPI (`vxSettingsApi`) opened from a ModsList entry (`BO/settings/hangar/__init__.py:191-216`) | config files only (`res_mods/configs/xvm/*.xc`) | MSA templates (player's `modsettings.dat`: `battleequipment`, `gunmarks`, `GunConstraints`, `advancedtankcarousel`, `AutoBattleMessages`, `protanki_*`, `mod_vehicle_exp`) | **files only**, `mods/configs/pmod` (tankist.net/interface/pmod) | own Gameface window from ModsList / floating button, plus Esc «///» in battle |
| Files | `mods/configs/mod_battle_observer/<profile>/<component>.json` + `load.json`, several profiles (`settings_loader.py:22-70`) | `.xc` (JSON with comments) | `mods/configs/<author>/<mod>/config.json` | `mods/configs/pmod/*` | `mods/configs/otmetki/*.json` |
| Player data (history, caches, positions) | — | `userprefs` | **`%APPDATA%\Lesta\MirTankov\mods\<mod>\`** (gunmarks, lebwa, protanki, pmod, battlehits on the player's machine; `battlehits/_constants.py:59-61` builds it from `BigWorld.wg_getPreferencesFilePath()`) | same (`pmod\statistic.json`, `pmod\gun_marks\`) | `mods/configs/otmetki` + `config_backup` copy beside preferences.xml |
| Hotkeys | key capture in Python (MSA `hotkeys.py:14-60`, `game.handleKeyEvent` override); BO pairs left/right modifiers (`useKeyPairs`, `keys_listener.py:76-85`) | `hotkeys.xc`: Alt (56) hold for `hitLogAltMode`, `damageLogAltMode`; Ctrl (29) hold for `minimapZoom`/`minimapAltMode` | Alt (`[[56,184]]`) for the equipment row's on-key mode | — | Ctrl+Shift+… for actions, Alt for marks/logs expand |
| In battle | nothing | nothing | nothing | nothing | Esc «///» (unique) |

Defaults (presets):

- **Battle Observer** installer types (`install/scripts/components.iss:5-7`):
  - «update» keeps what is installed;
  - «armagomen» is the author's set: league HP bars, totals and extended logs, main gun, battle timer, lamp timer + tick,
    minimap view radius/yaw limits/zoom, armour calculator, hangar efficiency widget, clocks, players-panel bars and
    damages, effects off, camera tweaks;
  - «user» is custom.

  Installed settings are copied with `onlyifdoesntexist` (line ~158), so an update never overwrites the player's
  settings. Every component's own default is `enabled: false` (`install/settings/bo_install/*.json`); the installer
  turns on what was ticked.
- **Jove**: one exe, tree of checkboxes, ready combinations; second page «Удалить все моды и очистить профайл»; in game
  «дополнительная кнопка справа внизу» (joves-modpack.ru/faq).
- **PROTanki**: LITE / BASE / EXTENDED editions (round 3 §1).
- **Aslain**: remembers the previous selection (round 3 §3).

Take from it:

- Updates must never reset settings (BO `onlyifdoesntexist`, «update» type).
- Player data belongs under the preferences folder, where pack installers that «clean mods» do not reach it. Our
  `config_backup` is a workaround for exactly this. The convention is to keep the data there in the first place.
- Alt = alternative view everywhere. Keep Ctrl+Shift for actions only.

## 4. Post-battle and hangar

| Topic | Convention (evidence) | Ours |
| --- | --- | --- |
| Result of the previous battle, in battle | **stock `battleNotifier`** (F1): left, y 365, ~4 s, game option, server flag | own card (behaviour parity moved it right) — duplicate |
| Post-battle message | PMOD replaces/extends the stock service-channel message and can add a session line (tankist.net); BO only filters service-channel types (`BO/components/service_channel_filter.py`, author preset hides repair/purchase/selling/greeting noise) | lines appended to the stock message (catalogue text) — matches |
| Detailed results screen | XVM adds its own data block to the stock results window (`XVM/xvm_battleresults/__init__.py:63-122`) | our results page in the mod window |
| Session statistics | stock session popover; XVM shows its button **with a battle counter** (`release/configs/default_lesta/hangar.xc:73-80`); PMOD session in the service channel, baseline = a dossier snapshot per account and date (`%APPDATA%\…\pmod\statistic.json`: `__date`, `_dossier`, `_session`) | hangar card |
| Hangar widgets | Battle Observer registers Gameface sub-views as **children of the stock lobby header** (`BO/hangar_gf/__init__.py:21-37`, `LobbyHeader._initChildren`), placed by CSS in viewport units (`efficiency.css`: `left: calc(50vw - 10px); top: 83px`), so they live and hide with the header | own Gameface window above the hangar, hidden by our wulf windows watch (`core/client/lobby_view`). Lesta 1.45 has no lobby state machine (`gui/lobby_state_machine` is absent from the RU sources), so the route check wotstat uses (`MainView.py:43-57, 166-176`) does not apply |
| Carousel | XVM default tile extras (`carouselNormal.xc:92-140`): avg damage, mastery badge, battles, win rate; **no MoE % by default** (available as `{{v.damageRating}}` and as a sort key, `xvm_tankcarousel/tankcarousel.py:233`); kurzdor `advancedtankcarousel` = rows count (3 in the player's MSA) and small slots | rows 1–5 (hangar_tweaks), MoE % optional (marks_panel) |
| One-off notices | ModsList badge: `alertModification(id)` / `clearModificationAlert` (`mods-list/python/gui/modsListApi/controller.py:98-120`); BO pushes `SM_TYPE.Warning` messages (`components/system_messages.py:30-31`) | update_notice card + notification |
| Hit viewer | BattleHits: own ModsList entry, disabled in the queue and closed when the queue starts (`battle-hits/python/gui/battlehits/hooks.py:117-160`) | own ModsList entry (catalogue) — matches |

**⚠ contradicts** [behaviour parity §5.2](2026-10-05-behavior-parity.md) («MoE % on the carousel tiles — XVM, PMOD, P1»).
XVM's default tiles do not show it; only PMOD is left as evidence, and it is unverified. Keep it as an option, not as an
expectation.

## 5. Install, update, development

- **Layout.** Every pack installs `.mtmod` into `mods/<game version>/`, settings into `mods/configs/<author>/…`, and
  player data into `%APPDATA%\Lesta\MirTankov\mods\<mod>\` (§3). OpenWG Common's docs give the same rules: one package
  per mod in `mods/<game-version>/`, never unpacked, old versions removed (`wot.common/README.md`).
- **Client patch.** Jove: «скачайте самую последнюю версию… микропатчи отключают устаревшие моды» — a new installer
  per patch (joves-modpack.ru/faq). Battle Observer: «update» installer type over the existing configs. МОСТ moves the
  packs itself (round 3 §3). Our manager's migration to `mods/<new>` is ahead of all of them.
- **Dev loop without a release** (what authors use):
  - `res_mods/<ver>/scripts/client/gui/mods/mod_*.py(c)`, loaded unpacked; or a dev `.mtmod` in `mods/<ver>` (ours:
    `mods/<ver>/otmetki-dev`, then restart).
  - **wotstat `chrome-devtools-protocol`**: Chrome DevTools attached to every live Gameface view at `localhost:9222`
    (Elements with in-game overlay, Console, `override.css`). On Lesta it needs wotstat's patched OpenWG Gameface
    (`docs/ru/guide/first-steps/devtools/index.md:9-43`). This is the tool for debugging our HUD page's layout in battle
    (F5) without guessing.
  - **`console.warn`, not `console.log`**, reaches the game log from Gameface JS (`gameface-theory/index.md:395`).
  - **OpenWG Common `openwg_console`**: an in-process Python 2.7 REPL on Ctrl+Alt+` (off by default,
    `docs/openwg_console.md`). **`openwg_filewatcher`** runs a Python command on directory changes
    (`docs/openwg_filewatcher.md`), which could reload a Gameface page on rebuild. Both need the authors' permission
    before we ship them (code study §9: no licence file).
  - `wot-gameface-types` (npm) gives typings for `engine`/`viewEnv` (`gameface-theory/index.md:373-380`).
- **Logs.** python.log; BO's own logger with a `DEBUG_MODE` switch in `main.json`; MSA saves its state with a 0-frame
  debounce (`modsSettingsApi/api.py:85-101`).

---

## 6. Gap list: each catalogue component against the sources

Legend: **match**, **differs** (how), **missing** (what the others have). P = suggested priority. Rows that only repeat
behaviour parity are left out unless the sources change the verdict.

### Battle

| Component | Convention (who, evidence) | Ours | Verdict | P |
| --- | --- | --- | --- | --- |
| *all battle panels* — overlay visibility | follow the page's component visibility (F2) | ¼ fade on Tab only | **differs**: hide fully; follow a reference alias; cover ЛБЗ and reserves | P0 |
| *all battle panels* — first layout | measure at populate / `engine.whenReady`, react to `clientResized`, `onScaleUpdated`, `AppEntry.updateStage` (F5) | 1 s poll, computed font-size scale | **differs** | P0 |
| *all battle panels* — Esc | stay under the menu (F3) | fade | **differs** only if the window is under the menu; verify z-order first | P1 |
| *all battle panels* — another pack present | step back (BO when XVM, F6) | — | **missing** | P1 |
| battle_results (previous-battle card) | stock `battleNotifier`, left y 365, ~4 s (F1) | own card, behaviour parity says right above the minimap | **differs / duplicate** — **⚠ contradicts** behaviour parity §1.2 | P0 |
| marks_panel (battle) | protanki/Near_You gunmarks: drag + 5 anchor points + minimise + Alt/«always alternate»; offset from anchor (`protanki_config.json`); Lebwa same flags | marks panel with Alt expand | **missing**: anchor choice, minimise, «always alternate» | P1 |
| battle_progress (main gun) | BO main gun shows the damage **left** to the medal, `x 260, y 0` from the centre (`main_gun.json`, `MainGunUI.as:101-118`), only in random/mapbox (`view_settings.py:190-191`) | rows with dealt/threshold | **differs** (show «left»; random only) — agrees with stock replacement «Damage and hit counters» | P1 |
| damage_log | XVM: stock log parts off by default, `x 240, y −23` bottom-left, Alt hold for the alternative template (`damageLog.xc:61-77`, `hotkeys.xc`); BO extended log Alt template | replaces the stock log, Alt expand | **match**; add «step back when XVM's log is on» | P2 |
| team_hp | BO: page component, alive count, per battle type, off in special battles (`view_settings.py:187-188`); hidden with V via `_blToggling` | replaces `fragCorrelationBar` | **match**; step back when BO/pmod bars exist | P2 |
| sixth_sense | BO: hides on death/switch/round end, tick sound on by default in the author preset, duration by equipment (`sixth_sense.py:114-151`, `sixth_sense.json`) | stock spot, fixed duration | **differs** (death/round-end hide, duration, tick) — as behaviour parity §2 | P1 |
| battle_loadout | kurzdor: left / right / free of the consumables panel, Alt on-key mode, minimise, setup badge; hides in postmortem and during the countdown setup screen (config.json, CHANGELOG 3.5, 3.10) | left of the stock panel | **missing**: follow `consumablesPanel` visibility (F4), on-key mode, right/free options | P1 |
| gun_arc | «УГН» (`GunConstraints`, the mod in the player's previous pack): **limit markers left and right of the reticle** (corner, brackets, big semicircle, semicircle, octagon) + optional centre marker (none, line, dot, triangle, octagon), a «faster redraw» option (player's `modsettings.dat` template); BO: yaw limits on the minimap | a scale under the reticle | **differs** — **⚠ contradicts** behaviour parity §2 («placement not documented»; it is now) | P1 |
| aim_info | distance in reticle common; armour calc in BO (`armor_calculator.json`) | distance, shell tooltips, armour off | match | — |
| crosshair | reticle packs replace the stock art; stock-replacement doc already hides the stock timer | presets + marks | match (after stock replacement) | — |
| bush_circle | Jove 15 m circle | hotkey | match | — |
| responsive_reticle | Lebwa «Быстрый отклик прицела» | on | match | — |
| battle_hotkeys | Near_You server reticle on a key, PMOD zoom | off | match | — |
| battle_menu | nobody has settings in battle | Esc «///» | unique, harmless | — |
| hud_layouts | BO per battle type (`view_settings.py:232-252`); wotstat per control mode positions | per battle type | match; add per-control-mode places (sniper/arcade) as wotstat does | P2 |
| minimap | BO: view radius, yaw limits, zoom on key, death names; XVM: Ctrl hold zoom/alt | game options | match (fair-play limits apply) | — |
| camera, chat_filter, streamer_mode, platoon_points | — | — | as behaviour parity | — |

### Hangar

| Component | Convention | Ours | Verdict | P |
| --- | --- | --- | --- | --- |
| *all hangar panels* — lifetime | BO: sub-views of the stock lobby header (live and hide with it), CSS viewport units | own window + windows watch | **differs** in mechanism; acceptable on Lesta (no lobby state machine). Consider the header-child technique for the clock/strip widgets: it removes our own visibility logic for them | P2 |
| hangar_info (clock strip) | BO `clock.css` `left 2.6vw; top 83px` under the header, child of the header view | top left under the header (catalogue) | match | — |
| session_stats | XVM: stock session button + battle counter; PMOD: session in the service channel, baseline per date | card | **differs**; add the counter-on-button option and the service-channel line (behaviour parity §1.3) | P2 |
| battle_results (hangar) | PMOD extends the one stock message; BO filters noise | lines in the stock message | match | — |
| marks_panel (hangar) | BO hangar efficiency widget: top centre under the header, `left 50vw, top 83px`, icons + avg damage/assist/blocked/stun/battles/win rate/**MoE %** (`efficiency.py:79-92`) | left column Tank card | **differs** in place; BO's top-centre line is the known spot for «this tank's numbers» | P2 |
| update_notice | ModsList `alertModification` badge + one message (`controller.py:98-120`) | card + notification | **differs**: drop the card, use the ModsList badge | P2 |
| hit_viewer | BattleHits ModsList entry, greyed and closed in the queue | ModsList entry | match; check the queue behaviour | P2 |
| replay_manager | poliroid: ModsList entry, login screen, stock replay context menu | page in our window | as behaviour parity | P2 |
| hangar_tweaks | kurzdor advancedtankcarousel (rows, small slots), XVM `carousel.xc` rows | rows 1–5 | match | — |
| crew_xp | Jove: tooltip line | tooltip + card (off) | match | — |
| config_backup | data under `%APPDATA%\…\mods\<mod>\` from the start (§3) | backup copy | **differs** in approach: move durable data there instead of mirroring | P2 |
| personal_missions, comp7_helper, event_trackers, depot_seller, auto_reserves, auto_resupply, quick_demount, hangar_space, notification_filter, hangar_cleaner, preset_advisor, free_camera, replay_upload | — | — | as behaviour parity | — |

### Manager / install

| Topic | Convention | Ours | Verdict |
| --- | --- | --- | --- |
| Settings kept on update | BO `onlyifdoesntexist`, «update» type | manager keeps configs | match |
| Presets | BO author set / custom / update; Jove combinations; PROTanki editions | 4 presets | match |
| ModsList | 1.6.01 on Lesta; button bottom right and on the login screen (MSA README screenshots) | dependency in the catalogue | match |

---

## 7. Top 15 behaviours to copy

| # | What | Who does it | Evidence | Our component |
| --- | --- | --- | --- | --- |
| 1 | Hide our battle panels exactly when the stock page hides its own components: mirror a reference alias in the existing `_setComponentsVisibility` wrapper (covers Tab, ЛБЗ, reserves, loading, destroy timer) | XVM (mirror), BO (page components) | `UI_teamBasesPanel.as:77-81`, `BattleLabels.as:143-146`; `BattleObserverLibraryMain.as:37-63`; `classic/page.py:114-152` | core HUD (all battle panels) |
| 2 | Do not hide under the Esc menu or F1; the stock HUD stays dimmed under the TOP_WINDOW menu (hide only if our window draws above it) | BO, XVM, stock | F3; `frameworks/wulf/gui_constants.py:81-98` | core HUD |
| 3 | First layout from the real size and scale: measure on `engine.whenReady`, subscribe to `clientResized` and `self.onScaleUpdated`, scale from `viewEnv.remToPx(1)`, `fitView()` every time | OpenWG media.js, wotstat docs | `media.js:97-172`; `gameface-theory/index.md:386-410` | ui-web `use-hud-screen`, `design-screen` |
| 4 | Re-layout on the app's stage update in Python (`AppEntry.as_updateStageS` / `updateStage(w, h, scale)`) and push it to the page | XVM | `xvm_main/handlers.py:46-48`; `application.py:406-407` | core/client/hud/gameface |
| 5 | Retire (or properly replace) the previous-battle card: the stock `battleNotifier` already does it (left, y 365/186, ~4 s) | stock 1.45 | F1 | battle_results |
| 6 | Equipment row follows the consumables panel's visibility: gone on death, during the countdown setup screen and in the video camera | kurzdor | battleequipment CHANGELOG 3.5.0, 3.10.00; `shared/page.py:348-351`; `classic/page.py:268-283` | battle_loadout |
| 7 | Equipment row options: left / right / free of the consumables panel, Alt on-key mode, minimise | kurzdor | `config.json` (`position`, `mode`, `hotkey [[56,184]]`, `minimized`); MSA template | battle_loadout |
| 8 | Marks panel: choose the anchor (centre, four corners), offset from it, minimise button, «always alternate» toggle | protanki / Near_You gunmarks, Lebwa | `protanki_config.json`; `lebwa/statshistory.json`; MSA `gunmarks` template | marks_panel |
| 9 | «УГН» as limit markers on both sides of the reticle (5 marker styles + centre marker), not a scale | GunConstraints (Lebwa list «УГН») | player's `modsettings.dat` template `GunConstraints` | gun_arc |
| 10 | Main gun shows damage **left** to the medal and only in random battles | Battle Observer | `MainGunUI.as:101-118`; `view_settings.py:190-191`; `main_gun.json` | battle_progress |
| 11 | Lamp hides on death, vehicle switch and round end; duration by equipment; tick sound | Battle Observer | `sixth_sense.py:11-13, 114-151`; `sixth_sense.json` | sixth_sense |
| 12 | Step back when XVM / BO / pmod already replace the same stock element | Battle Observer | `view_settings.py:165-168, 198-218` | team_hp, damage_log, minimap |
| 13 | Saved offset `[0, 0]` = the default place; «reset» zeroes it; the default may move between versions | Lebwa, kurzdor | `statshistory.json`, `config.json` `offset [0,0]` | core HUD panel config |
| 14 | Player data (history, positions, caches) under `%APPDATA%\Lesta\MirTankov\mods\<mod>\`, never wiped by «clean mods» installers; settings files are never overwritten by an update | protanki, Lebwa, pmod, BattleHits; BO installer | player's machine; `battlehits/_constants.py:59-61`; `components.iss` `onlyifdoesntexist` | core storage, config_backup |
| 15 | One-off notices through the ModsList badge (`alertModification`) plus one service-channel message, not a permanent card | ModsList API, BO | `controller.py:98-120`; `system_messages.py:30-31` | update_notice |

## 8. Live checks this note asks for

1. Lesta: is `isBattleNotifierEnabled()` true, and does the stock notifier show the previous battle in a random battle?
   (Decides F1.)
2. Does the Esc menu draw over our Gameface HUD window? (Decides F3.)
3. With wotstat DevTools attached to the HUD page in battle: what are `viewEnv.getClientSizePx()`,
   `viewEnv.remToPx(1)` and the computed root font-size before and after the first Ctrl press? (Confirms F5.)
4. Open ЛБЗ (quest progress) and reserves in battle: do our panels hide with the stock HUD after the overlay change?
