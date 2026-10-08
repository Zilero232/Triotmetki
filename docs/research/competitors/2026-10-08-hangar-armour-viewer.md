# Hangar armour viewer: how Armor Inspector does it, what the RU 1.45 client offers, what we build (research 2026-10-08)

The owner wants an armour viewer in the hangar, like the Armor Inspector that the Jove, PROTanki and МОСТ packs ship ([round 3](2026-09-29-modpacks-round3.md) row «Броня в ангаре», P1-5; [behavior parity](2026-10-05-behavior-parity.md) §5.2). This note covers how Armor Inspector works, what the 1.45 client exposes, whether Gameface can draw 3D, and a recommendation.

**Summary.**
- Armor Inspector does not recolour the hangar tank. It opens its own 3D app: a C++ engine compiled to WebAssembly with WebGL, in the client's Chromium (CEF) browser, plus a ~24 MB encrypted data package and a Scaleform button under the tank.
- The 1.45 client has no renderable collision geometry. `collision_client/*.havok` can only be queried by ray tests. It does have exactly the ray test we need on the hangar vehicle: `appearance.collisions.collideAllWorld` plus the descriptor's per-material armour. Our `hit_viewer` already uses both.
- Gameface officially supports only a 2D canvas. Our three.js r186 viewer needs WebGL 2, which rules it out inside Gameface.
- Recommendation: build in two steps.
  1. **S:** a button «Броня в 3D» that opens our site's viewer in the client's own browser overlay.
  2. **M:** a native hangar mode, «Броня в ангаре». Python samples a grid of rays over the real hangar tank and draws the result as a colour overlay and hover readout on our existing hangar HUD page.
- Neither step needs Scaleform injection, custom shaders or materials.

---

## 1. The rule: confirmed

Lesta support article 15152, «Запрещённые модификации клиента игры» ([lesta.ru](https://lesta.ru/support/ru/products/mt/article/15152/), re-fetched 2026-10-08; quoted in full in the [fair-play audit](../data/2026-10-05-fair-play-audit.md), items A and H):

- **A:** «Последняя категория — модификации для анализа брони в бою. Мы считаем, что этот функционал предоставляет игрокам значительное преимущество…» In-battle armour analysis is **not yet on the list but announced for it**. Once Lesta ships its own tool, «аналогичные модификации с дополнительными функциями (к примеру, такими, которые отображают уязвимости в бою)» get banned.
- **H:** «Обратите внимание: это относится только к тем модификациям, которые работают в бою. Мы абсолютно не против модов, действующих только в Ангаре (не во время сражения).»

So the owner's reading needs one correction: armour analysis in battle is announced to be banned, and we already treat it as forbidden (aim_info 0.1.1). **Hangar-only armour analysis is explicitly fine.** Two consequences:
- The component must be impossible to use in battle.
- If Lesta adds a stock viewer, the component falls under our [no stock duplicates](../../../apps/game/modpack/CLAUDE.md) rule and goes behind the kill switch. WG already ships one: the 2.0 Garage «Armor Inspector», «nominal and effective armor… using the exact collision models from the server» ([WG news](https://worldoftanks.com/news/general-news/update-2-0-garage-ux/)). Lesta 1.45 has none: no armour view in `gui/impl` or the `gui-part*.pkg` names, checked 2026-10-08.

## 2. Armor Inspector: how it works

**Sources:**
- [wotinspector.com/en/mods/armorinspector](https://wotinspector.com/en/mods/armorinspector/): v4.5.0, authors Andrew Karpushin (reven86) and Clément Durand
- [wgmods.net/2319](https://wgmods.net/2319/)
- the MT forum topic [«[ALL] Armor Inspector»](https://forum.tanki.su/topic/2214954-all-armor-inspector-%D0%B8%D0%BD%D1%81%D0%BF%D0%B5%D0%BA%D1%82%D0%BE%D1%80-%D0%B1%D1%80%D0%BE%D0%BD%D0%B8/), updated for 1.45
- aggregator pages: [wot-hack](https://wot-hack.ru/armor-inspector-wot/), [wotspeak](https://wotspeak.org/programms/176-shema-bronirovanie-i-kollizhn-wot.html)
- the released package `wotinspector.com.armor_inspector.4.5.0.wotmod.zip` (Backblaze link on the mod page), downloaded to the session scratchpad and read as strings only

The Python is a protected marshal blob (`<protected>`), so it was not decompiled.

**Licence.** `LICENSE`: «Free for personal use and use in non-profit organizations». Not usable in a paid product. Idea reference only.

| Aspect | What the package shows |
| --- | --- |
| Package | `res/ai/armor-inspector.{js,wasm,data}`: an Emscripten build (`/Users/vagrant/git/Client/_out/emscripten/…`), wasm 7.9 MB, JS 185 KB. `armor-inspector.data` is 23.9 MB and preloads `/data/console.zip` (encrypted ZIP) and `/data/resources.data`. Also `res/gui/flash/ArmorInspector.swf` and `ArmorInspectorPreview.swf` (1.7 KB each), `mod_armorinspector.pyc` (1.3 MB, bundles six and protobuf). The zip also contains ModsListApi 1.7.6 and OpenWG Gameface 1.1.5. |
| Rendering | Its own engine in WebGL. The JS asks `getContext("webgl2")`, then `"webgl"`, and loads Firebase analytics from `gstatic.com`. It runs in the client's **Chromium browser** (CEF, `win64/libcef.dll`, Chromium 103.0.5060.134): the forum asks players to enable «аппаратное ускорение», aggregators say the button «opens a browser page», and Gameface cannot run WebGL 2 (§4). It does not touch the hangar tank's materials. |
| Geometry | Ships its own collision models and crew/module positions («accurate collision models extracted directly from game resources», «unique content… crew and internal modules»). The client has no internal modules or crew in its collision files. |
| UI entry | The Scaleform SWFs find `AmmunitionPanelMC` / `maintenanceBtn` / `tuningBtn` in the hangar and the vehicle preview's `bottomPanel` and add a button: «кнопка Armor Inspector… по центру под танком». The JS exposes `_setPlayerVehicle`, `_setTargetVehicle`, `OnTargetVehicleChanged`, `OnShotChanged`, so Python passes the tank and shots in. |
| What it shows | Three modes. **X-ray:** armour, modules, crew. **Duel:** penetration chance for a chosen gun and shell, as a colour gradient (the «hitskin»). **Ram:** ram damage. Also HE damage maps, hidden specs, and the full shot simulation along a trajectory. |
| Battle side | Records the battle: protobuf `ArenaPlayerAdded`, `ArenaVehicleStatistics`, `SpotRay`, a `heatmaps` module, `wotinspector.replays`. It syncs shots to armor.wotinspector.com and the mobile app. This is other players' data sent to a third party, which our fair-play rule forbids. Our `hit_viewer` covers the own-hits part. |
| Known issues | Slow first launch; needs browser hardware acceleration and «disable AdBlock»; site/«Battle Assistance» outages break features (forum). It is re-released for every client patch (4.5.0 → 4.5.1 for 1.45). There is a separate PROTanki «анализ брони» mod (thickness in a tooltip by the cursor on the preview tank, «адаптировано для 2.4.0.2 / 1.45.0.0», [wotsite](https://wotsite.net/mody-dlya-world-of-tanks/12309-mod-dlya-analiza-broni-tankov-pryamo-v-angare-dlya-wot.html)). That is the ray-test approach of §5 option B, without the overlay. |

## 3. What the RU 1.45 client offers

Read from `D:\Games\Tanki` (v.1.45.0.0 #2290: `res/packages`, `win64`) and the decompiled RU sources on [izeberg/wot-src@RU](https://github.com/izeberg/wot-src/tree/RU/sources/res/scripts).

| Question | Finding |
| --- | --- |
| Collision files | `vehicles_level_*.pkg`: `vehicles/<nation>/<tank>/collision_client/{Hull,Chassis,Turret_01,Gun_01}.havok` only. There is no `.model`, `.visual` or `.primitives`, although the XML names `collision_client/Hull.model` (`hitTester/collisionModelClient`). [armor-viewer.md §1](../data/armor-viewer.md) has the format. **`BigWorld.Model` cannot load them as a drawable mesh.** |
| Script access to collision | `common/ModelHitTester.py`: `BigWorld.BspCollisionModel().setModelName(...)` with `collideSegment` / `collideSegmentNearest` / `collideSphere` / `getBoundingBox`. All of these are queries; nothing returns triangles (no `getTriangles` in `Tanki.exe`). |
| The hangar vehicle | `gui/hangar_vehicle_appearance.py` `HangarVehicleAppearance.__startBuild` builds `BigWorld.CollisionAssembler` from the four parts' `hitTesterManager.modelHitTester.bspModelName` (`ModelCollisions`). `__setupModel` connects it as `self.collisions` (`BigWorld.CollisionComponent`: `collideWorld`, `collideAllWorld`, `collideShape`, `collideLocal`, `getBoundingBox`). The client itself ray-tests it in the hangar for decals (`__getAttachedPartIdx`). The same appearance drives the tech-tree / store **vehicle preview**, so any tank can be inspected. |
| Ray result → armour | `Vehicle.collideSegmentExt` shows the tuple: `(dist, hitAngleCos, matKind, partIndex)`. `typeDescriptor.<chassis/hull/turret/gun>.materials[matKind]` gives `armor` (mm), `vehicleDamageFactor` (0 = spaced), `useHitAngle`, `mayRicochet`, `collideOnceOnly`. **Thickness comes from the client; no server needed.** Already used by `features/hit_viewer/client/stage.py` (`measure`, `_material`) with the pure `model/armor.py` (`plate_analysis`: angle, normalisation, effective). |
| Cursor → ray | `AvatarInputHandler/cameras.getWorldRayAndPoint(x, y)` (fov, near plane, `BigWorld.camera().invViewMatrix`) is pure math and works with the hangar camera. `hit_viewer` already drives `HangarCameraManager.moveCamera`. |
| Material overrides | `Tanki.exe` has `BigWorld.PyMaterial` (created from an `.fx` effect file), `PyMaterialFashion`, `TransformMaterialFashion`, `MaterialDisabler.setMaterialKindVisible`, `DynamicModelComponent.setMaterialParameter{Float,Vector*,Texture}`, `TextureFashion`, `AlphaFadeFashion`. There is no `WGMaterialDisabler`. The **visual** mesh is not the collision mesh and has no armour groups, so these can tint a model but cannot colour it by plate. |
| Built-in browser | CEF (Chromium 103) through `BrowserController` / `gui/impl/lobby/common/browser_view.py`. `gui/shared/event_dispatcher.showBrowserOverlayView(url, alias=VIEW_ALIAS.BROWSER_LOBBY_TOP_SUB, …)` only expands macros in the given URL. `BrowserController.load` appends `GUI_SETTINGS.browser.params`, so don't use it. `browser_filters` has no whitelist. `BigWorld.openWebBrowser` (our `packages/ui/client/browser.py`) opens the **external** browser. |

**Server data.** `apps/web/server/src/modules/gamedata/lib/armor/*` builds per-tank packs from [unicum-gg/wot.models@Lesta](https://github.com/unicum-gg/wot.models/tree/Lesta) (positions, indices, plate groups, joined thickness and spaced flags; `GET /tanks/:idOrSlug/armor`).
- In the client it only helps a renderer that draws its own geometry (option C/D). The ray-test approach needs none of it, because the thickness is already in the descriptor.
- `armor3d` is metered (`packages/schemas/src/usage/usage.constants.ts`: anonymous 3, free 15, Plus unlimited). This matters for the browser fallback.

## 4. Gameface and 3D

- The client ships `win64/cohtml.WindowsDesktop.dll` (Licenses.txt: «Coherent Labs… 2012-2023»).
- Coherent's [canvas support table](https://docs.coherent-labs.com/cpp-gameface/content_development/supported_features_tables/canvassupport/): «Only "2d" contextType is supported». `putImageData` / `getImageData` / `ImageData` / `Path2D` / `toDataURL` are not supported; `fillRect`, `drawImage` and `globalAlpha` are.
- The DLL's JS shim does have a `case 'webgl': … this._getContextWebGL()` branch, with no `webgl2`. So WebGL 1 may exist undocumented in this build. Untested, and its native stability is unknown.
- three.js removed WebGL 1 in r163 ([migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide), [forum](https://discourse.threejs.org/t/r163-workaround-to-keep-supporting-webgl-1/63547)). Our site is on 0.186.
- **Conclusion: the site's three.js viewer cannot be reused inside a Gameface window.** It would need three ≤ r162 or a hand-written WebGL 1 renderer, on an undocumented context.
- The CEF browser does run WebGL 2, but Next.js 16 targets Chrome 111+ ([supported browsers](https://nextjs.org/docs/architecture/supported-browsers)), and CEF here is Chromium 103. The armour page must be checked there (CSS `:has`, `color-mix`, nesting).

## 5. Options

| | Approach | Native crash risk | Effort | Verdict |
| --- | --- | --- | --- | --- |
| A | Button → our site's viewer in the CEF overlay (`showBrowserOverlayView('https://triotmetki.ru/<locale>/t/<intCD>/armor?src=mod')`) | Low: stock view, stock call | S (mod) + S/M (site check on Chromium 103, maybe a lean `/embed` route) | **Step 1** |
| B | Screen-space hit-test overlay on the real hangar tank: Python casts a grid of rays through `appearance.collisions.collideAllWorld`, colours each cell by thickness and draws it with 2D canvas `fillRect` in our hangar HUD page; hover readout from one ray per mouse move | Low–medium: only calls the client already makes in the hangar; no inject, shader or material. Risks: frame hitches from Python, and a query on a destroyed `CollisionComponent` during a vehicle swap | M (spike, then the component) | **Step 2: the «like Armor Inspector» feature** |
| C | Gameface window with WebGL 1 and our server geometry | Unknown/high: undocumented context; we had 0xC0000005 from Gameface/Scaleform work | L | Out. At most a 1-hour probe in the dev page |
| D | Recolour the hangar model through `PyMaterial` + custom `.fx` / `MaterialFashion` | High (custom shaders, fashions on the compound model) and it cannot work: the visual mesh has no plate ids | L/XL | Out |
| E | Ship our own geometry or a WASM engine like Armor Inspector | Low natively, heavy (≈25 MB per release on our VPS, no CDN) | L | Out: the site already has it (A) |

## 6. Recommended feature

**Step 1: «Броня в 3D» (A)**
- An action in an existing hangar component (round 3 P1-5 suggested `hangar_info`), or a button on our hangar HUD page next to the tank. It opens `showBrowserOverlayView` with the selected or previewed tank's `intCD` (`g_currentVehicle.item.intCD`, or `g_currentPreviewVehicle`).
- Fallback: `open_url` (external browser) when the client lacks the overlay call or it raises at once; `showBrowserOverlayView` is an `adisp_process`, so a failure while it loads the view is not seen by the caller.
- It sends nothing to our server. The URL carries a public tank id; the site visit is the player's own request.
- To check on the site:
  - the page in Chromium 103;
  - the attribution footer;
  - the `armor3d` meter: CEF has its own cookie jar, so the player is anonymous (3 views). Either sign in with Lesta ID inside the overlay, or the owner decides on an exemption for `src=mod`.

**Step 2: component `armor_view` «Броня в ангаре» (B)**, off by default, hangar only.
- **Activation:**
  - a toggle button on our hangar HUD page (no Scaleform inject);
  - optionally a hangar-only hotkey through `core.client.hotkey`, registered only on the lobby view;
  - Esc or the toggle leaves the mode.
- **What it shows:** the hangar tank (own or previewed) under a translucent colour overlay. While the camera moves the overlay hides; when it stops, it rebuilds coarse-to-fine (for example 48 px, then 16 px cells, a few hundred rays per tick).
- **Modes:**
  1. **Nominal:** `material.armor`.
  2. **Effective** from the current view: `armor / hitAngleCos` when `useHitAngle`.
  3. **Against a shell:** own selected vehicle's guns and shells from its descriptor (pen at 100/500 m, caliber), with normalisation and overmatch from `hit_viewer/model/armor.py`, and the ±25 % band. Colours: red = no pen or ricochet, yellow = in the band, green = pen.
  - Spaced plates (`vehicleDamageFactor == 0`), tracks and the gun are drawn in fixed hues, as on the site.
- **Hover readout:** part, nominal, angle, effective, spaced; with modes 1–2, the layers along the ray (`collideAllWorld` returns all hits).
- **Legend:** a colour bar with mm stops (or pen / band / no pen in mode 3) in the corner of the HUD page.
- **Code:**
  - Move `hit_viewer`'s `collisions()` / `_material` / `measure` glue into core (one hangar-vehicle armour probe both components use).
  - Grid scheduling, colour scale and the shell maths go in the feature's pure `model/` with tests.
  - Overlay and legend go in a `ui-web` HUD entity.
- **Guards:**
  - Rebuild only after the appearance reports `isLoaded`. The client answers rays a frame late, as noted in `stage.py`.
  - Drop the run on `CameraRelatedEvents.VEHICLE_LOADING`.
  - Re-read `appearance.collisions` every batch; never keep it between ticks.
  - Cap the ray budget per tick and measure it in the spike.
- **Spike first (½–1 day):**
  - time 2 000 `collideAllWorld` calls on the hangar tank;
  - check that a 2D-canvas grid of about 10 000 `fillRect` keeps the hangar frame rate;
  - check the overlay against the model at all camera distances.

**What stays out**
- Anything in battle: no import in battle, no battle hook, no armour under the reticle (article 15152 A).
- Enemy tanks in battle.
- Internal modules and crew (not in the client's collision files).
- Shot recording beyond `hit_viewer`.
- Third-party analytics.
- Custom materials and shaders.
- Gameface WebGL.

**Catalogue**: category hangar, fair-play note «Только в ангаре; в бою не работает (статья 15152: анализ брони в бою объявлен к запрету, моды только для ангара разрешены)», kill-switch entry, CHANGELOG line.

## 7. Entry points

How the packs put a hangar tool in reach, and what the RU 1.45 client allows (read 2026-10-08 from `D:\Games\Tanki\res\packages\scripts.pkg`, the `.pyc` names and constants, and the local copies in `refs/mods`).

| Pack / mod | Entry point | How |
| --- | --- | --- |
| Armor Inspector (Jove, PROTanki, МОСТ ship it) | A button «по центру под танком» in the hangar and in the vehicle preview (§2) | Two 1.7 KB Scaleform SWFs that find `AmmunitionPanelMC` / `maintenanceBtn` / `tuningBtn` and the preview's `bottomPanel` and add a button. Flash injection into stock views. |
| PROTanki «анализ брони» (`tv.protanki.reducedarmor`) | Its own ModsList entry «Броня», its own lobby view (corrected in §8.1; the first pass read only the download page) | ModsListApi `addModification`, Scaleform view |
| poliroid BattleHits (Jove, Lebwa, Near_You) | Its own ModsList entry, greyed in the queue | `g_modsListApi.addModification(id=…, lobby=True)` (`refs/mods/poliroid__battle-hits/python/gui/battlehits/hooks.py:110-160`) |
| poliroid Replays Manager | Its own ModsList entry, the login screen and the stock replay context menu | `addModification` plus its own context menu handler (`rmanager/controllers/actions.py:217`, `_generateOptions`) |
| Battle Observer, XVM | Settings through ModsSettingsAPI from a ModsList entry, or config files; no armour tool | [deep dive](2026-10-05-modpacks-deep-dive.md) |
| WG 2.0 Garage (stock, not on Lesta) | «About Vehicle» → Armor tab, from the garage, the tech tree and the **vehicle's right-click menu** ([WG news](https://worldoftanks.com/news/general-news/update-2-0-garage-ux/)) | Stock UI |
| Ours today | `ui` (`otmetki`) and `hit_viewer` (`otmetki_hit_viewer`): two ModsList entries from one modpack | `packages/ui/client/entry_points/mods_list.py`, `features/hit_viewer/client/mods_list.py` |

**What 1.45 has:**
- **ModsList** keeps entries by `id` (`controller.py`: a second `addModification` with a known id becomes `updateModification`), so one mod may add several. We already ship two.
- **The carousel is Scaleform:** `gui/Scaleform/daapi/view/lobby/hangar/carousels/{basic,ranked,comp7,epicBattle,battle_pass,mapbox,…}/tank_carousel.pyc` (`TankCarouselMeta`). Its right-click menu is the Python handler `gui/Scaleform/daapi/view/lobby/hangar/hangar_cm_handlers.VehicleContextMenuHandler`, registered for `CONTEXT_MENU_HANDLER_TYPE.VEHICLE` (`'vehicle'`) by `lobby/hangar/__init__.getContextMenuHandlers` (inside `BootcampComponentOverride` with the bootcamp variant). It keeps the tank in `vehCD` (`_initFlashValues`), builds its list in `_generateOptions(ctx)` with `_makeItem(optId, optLabel, …)`, and `AbstractContextMenuHandler.onOptionSelect(optionId)` (`framework/managers/context_menu.pyc`) calls the method its id maps to or logs «Unknown context menu option». That is the same seam `quick_demount` overrides on the tank setup's `OptDeviceItemContextMenu`: pure Python, the Flash side only draws the list it gets. **Safe** with `core.hooks.override` (original first, our item appended, only our id answered).
- **Vehicle preview:** `g_currentPreviewVehicle` (`CurrentVehicle`); its bottom panel is Scaleform, reachable only by Flash injection.
- **Browser:** `gui.shared.event_dispatcher.showBrowserOverlayView(url, alias=VIEW_ALIAS.BROWSER_LOBBY_TOP_SUB, params=None, callbackOnLoad=None, webHandlers=None, forcedSkipEscape=False, browserParams=None, hiddenLayers=None, parent=None)` (an `adisp_process`: `GUI_SETTINGS.checkAndReplaceWebBridgeMacros`, `URLMacros().parse`, then a `LoadViewEvent`); the name is confirmed on 1.45.
- **Hotkey:** possible through `core.client.hotkey`, but no pack opens an armour tool by key, and our settings window rule already avoids hotkeys for windows.

**Choice for `armor_view`:** its own ModsList entry (the selected or previewed tank) and «Бронирование» in the carousel tank menu (any tank of the carousel), both opening the site's viewer in `showBrowserOverlayView`, the external browser when the client has no overlay call (`open_in: browser` opens it always). No button under the tank: that needs a SWF injected into `AmmunitionPanelMC`, and Scaleform/Gameface injection is where our native crashes came from (0.3.7, 0.3.8). No hotkey.

**Step 2 built (2026-10-08):** the ModsList entry now toggles the in-hangar map on the selected tank (the site in the vehicle preview), and the carousel menu offers «Броня в ангаре» and «Броня в 3D на сайте». The HUD page in the hangar takes no input outside the HUD edit mode, so the map's keys (1 2 3 modes, Q E shells, R attacker, Esc) and the hover ray under `GUI.mcursor()` run on the Python side. The shot rules are the client's own reticle rules (`gun_marker_ctrl._CrosshairShotResults`, the defaults of `arena_visitor._ArenaModifiersVisitor`), not the ones guessed in §6. Details: the modpack README «armor_view».

## 8. ModsList viewers in other modpacks

Second pass, 2026-10-08, after the owner's correction: «Броня в ангаре я имел ввиду в модлист, а не прям в ангаре» — the viewer should open from ModsList as its own screen, not as a toggle over the plain hangar. Sources: the mod pages and forum topics linked below, the released packages (read as files only, never run), the web builds of the same tools opened in a browser, and our own `python.log` from today's client run.

### 8.1 What exists

| Tool | How the player opens it | What opens | What it shows | Data | Known problems |
| --- | --- | --- | --- | --- | --- |
| **Armor Inspector** 4.5.x (wotinspector; shipped by Jove, PROTanki, МОСТ, Aslain) | A button «Armor Inspector» under the tank in the hangar and in the vehicle preview: «В Ангаре нажать на кнопку "Armor Inspector"» ([forum](https://forum.tanki.su/topic/2214954-all-armor-inspector-%D0%B8%D0%BD%D1%81%D0%BF%D0%B5%D0%BA%D1%82%D0%BE%D1%80-%D0%B1%D1%80%D0%BE%D0%BD%D0%B8/)). The package also has a 48×48 `res/scripts/client/gui/mods/mod_armorinspector.png` next to the `.pyc` and bundles ModsListApi 1.7.6, the usual sign of a ModsList entry. The code is encrypted, so the entry is likely but **unconfirmed**. | The client's CEF browser overlay. «Без аппаратного ускорения инспектор открывается в обычном браузере, а не в игре» (forum); «откроется страница браузера с выбранным ранее танком» ([wot-hack](https://wot-hack.ru/armor-inspector-wot/)). | Modes **Дуэль** (penetration % per point for the chosen gun and shell), **Таран** (ram damage, speed sliders), **Рентген** (armour, modules, crew), an HE heat map. Shot scenarios from the last battle. | Its own packaged collision, module and crew models (~24 MB data plus a 7.9 MB wasm), Firebase analytics | Slow first launch; needs hardware acceleration and no AdBlock; needs its site; re-released every patch. The mobile build of the same engine locks tiers IX–X behind a paywall («only from a weird above-and-to-the-right angle», [App Store](https://apps.apple.com/app/id905734645) review). It records battles for a third party (§2). |
| **PROTanki «анализ брони»** = `tv.protanki.reducedarmor` 3.4.6 «Reduced Armor» (Scaleform views in the `poliroid.views.lobby.reduced_armor` package, i.e. built by poliroid for PROTanki; the [wotsite 12309](https://wotsite.net/mody-dlya-world-of-tanks/12309-mod-dlya-analiza-broni-tankov-pryamo-v-angare-dlya-wot.html) archive, «2.4.0.2 / 1.45.0.0», 672 KB, unpacked to the scratchpad and read as strings; no licence file, the `.pyc` is encrypted) | **ModsList**: it bundles ModsListApi 1.6.01 (Lesta) / 1.7.8 (WG) and ModsSettingsAPI 1.7.0, and its texts carry the entry pair `armorLabel: Броня` / `armorDescription: Рассчет бронированния`. A `ReducedArmorCMRenderer` class suggests a context-menu item as well. The page text says it works in the vehicle preview (carousel or tech tree) and suggests ShowVehicle for tanks not owned. | Its own Scaleform lobby view `ReducedArmorMain` over the real 3D tank (not a browser): a progress bar while it computes; a «КОЛЛИЗИЯ» button that opens a popover «Бронирование» with «Рассчитать», «Автообновление» («при изменении положения камеры»), «Прозрачность наложения» and «Точность вычисления»; the overlay is drawn as Scaleform rectangles (`collisionHolder`, `drawRect`, `as_updateCollisionDPData`, `_collisionSize`). | An info tab with shell-type buttons AP / APCR / HEAT / HE (normalisation tooltips: 5°, 2°, none, none), editable **calibre** and **penetration** (`onCalibreChange`, `onPiercingChange`), and 2-calibre / 3-calibre rule indicators. A popup by the cursor (`reducedArmorMouse`): «Результат» (Пробитие / Не пробил / Рикошет / Попадание), «Приведённая броня», «Элементы» along the ray (орудие, гусля, экран, п. наблюдения, броня). | The client's own collision rays over the hangar tank, the same approach as our map | Manual «Рассчитать» or auto-update on every camera move; accuracy versus time is left to the player; Scaleform injection; the shell is typed in, not taken from a tank; no legend of thicknesses in the strings |
| **poliroid BattleHits** (MIT; Jove, Lebwa, Near_You) | Its own ModsList entry, greyed in the queue | A separate hangar view over the real 3D tank, with a compact list at the side | Own hits, not armour | Battle records | It sets the convention for a hangar tool opened from ModsList. Our `hit_viewer` copies it and **works on 1.45**: `python.log` 15:07:36 «hit viewer: opened, 14 recorded battles», the page frame read, then «closed… the hangar vehicle and camera are back». |
| **WG 2.0 Garage Armor Inspector** (stock WoT EU/NA, not Lesta) | The Vehicle Management icon under the tank → ARMOR. Also About Vehicle → Armor, and the vehicle's right-click menu ([WG news](https://worldoftanks.com/news/general-news/update-2-0-garage-ux/), [WG guide](https://worldoftanks.com/en/content/guide/newcomers-guide/how_to_survive/)) | A stock garage screen over the real garage model | Module configuration on the left. «Overlay Type» on the right: nominal, or **Penetration Chance** for the attacker's gun and shell. Hover over a plate for nominal, effective and hit angle. | «Exact collision models from the server» | It is the bar the community now compares against. If Lesta copies it, our no-stock-duplicates rule applies (§1). |
| **tanks.gg** (site, has a WoT 2.4 / Lesta switch) | Website, «3D Model» tab | A browser page | Screenshot of [IS-7](https://tanks.gg/tank/is-7/model) on 2026-10-08: left: a vertical nominal legend, 0 → 270 mm, green → red; right: a spaced-armour legend, cyan → magenta; top-left: a view dropdown (Collision / **Live** / Visual / Visual HD / Hybrid / Hybrid Live); bottom-left: a gun-arc dial; bottom centre: own gun and turret **«VS»** the target's gun, turret and shell (AP); top-right: a camera button In Live mode: green means it penetrates, red means it does not, magenta means ricochet, and tracks and spaced armour are pale grey. | Extracted models | No modules or crew; it is a website |
| **armor.wotinspector.com** (site, the same engine as the mod) | Website | A browser page | Screenshot of [СТ Молот](https://armor.wotinspector.com/ru/mirtankov/7946753--/) on 1.45: a wide 3D canvas on a light floor; a **left icon rail**: Mir Tankov/version, рентген, дуэль, теплка, таран, опции; a **right icon rail**: фото, вид, быстр., экран; bottom centre: an attacker → target chip, and the «Цель … выбрать» picker under the canvas Thickness runs green → yellow → red → magenta; tracks are violet, the gun blue, small screens cyan. | Its own models | Ads under the viewer on the RU page |
| **TONK Armour Viewer** (another game; UX reference, [wiki](https://tonk.wiki.gg/wiki/Armour_Viewer)) | In its garage | A garage screen | Calibre and penetration sliders top right, defaulting to the shell of the tank on screen; the tank list bottom left. Colours: green pen, yellow/orange within ±10 %, red no pen, pink ricochet, cyan overmatch, clear spaced. | Game data | — |
| XVM, Battle Observer, Jove's and МОСТ's own code | — | — | No armour viewer of their own; they ship Armor Inspector ([round 3](2026-09-29-modpacks-round3.md)) | — | — |
| «Шкурки с зонами пробития» (2012, [goha](https://www.goha.ru/wotdbru-obnovlenie-ot-7-noyabrya-xzYqkl)) | Installed textures | Recoloured tank skins, also in battle | Hand-drawn weak spots | Artist's guess | Battle-visible and inaccurate; out |

### 8.2 What the layouts have in common

- **Two families.**
  - A browser app with its own models: Armor Inspector (WASM in CEF), the sites.
  - The client's own collision rays over the real hangar tank, in a separate lobby view opened from ModsList: PROTanki «Reduced Armor» (Scaleform rectangles, poliroid). That is our map, inside its own screen instead of the HUD page. The owner's request matches this family.
  - WG draws the stock screen with its engine.
  - Nobody draws armour in Gameface yet.
- **The good layouts share one grammar** (WG, tanks.gg, armor.wotinspector, TONK):
  - the tank takes the whole screen;
  - a mode switch: nominal / effective / penetration;
  - an attacker block: gun, shell, sometimes distance; tanks.gg puts it as «own VS target»;
  - a vertical colour legend at the edge;
  - a hover card for one point;
  - module configuration (WG);
  - camera presets or a free orbit.
- **What nobody has in game:**
  - the full client shot rules with a chance per point (screens, HEAT jet loss, the ±25 % band; our `core/armor/penetration`). PROTanki shows the 2- and 3-calibre rules and normalisation, but gives a verdict without a chance;
  - an offline viewer with no download;
  - any tank from the tech tree without an extra mod. PROTanki needs ShowVehicle; Armor Inspector needs its site;
  - the attacker's real gun and shells instead of typed-in calibre and penetration (PROTanki), and a thickness legend.

### 8.3 What is doable for us on Lesta 1.45

Facts measured or read today:

- **Ray cost.** Our armour map logged `2144–2509 rays in 177–210 ms` (`python.log` 15:06:10–15:06:22, 3 levels, 8 px cells). That is about **12 rays per ms (≈ 80 µs per ray)**, Python overhead included.
- **Rays need no hangar camera.** `collideAllWorld(start, end)` takes world points. Rays can start from a plane in the vehicle's own frame (front, side, rear, top), wherever the hangar camera is. The results depend only on the tank and its modules, so they can be cached.
- **A tank that is not in the hangar.**
  - `BigWorld.BspCollisionModel().collideSegment(start, stop)` returns `(dist, normal, hitAngleCos, matKind)`, normal included (`common/ModelHitTester.worldHitTest`).
  - The parts can be placed with `chassis.hullPosition`, `hull.turretPositions[0]` and `turret.gunPosition`, as `model_assembler` does.
  - This route would work without the hangar, but `setModelName` loads synchronously; on 1.45 it is untested.
  - The simpler route is the one `hit_viewer` already uses: `g_currentPreviewVehicle.selectVehicle(intCD)` puts **any** tank into the hangar, and its collision answers.
- **The browser route fails today.**
  - `python.log` 15:05:27 and 15:06:47: `[MTWebBrowser] FAILED Url: https://triotmetki.ru/t/62465/armor, Http code: 418`, and the overlay closed.
  - `curl` gets 200 for the same URL, also with the client's Chrome 103 user agent. Something on our edge refuses the client's browser.
  - Unrelated but found on the way: the site's `Link` response header repeats the `http://localhost:3000` hreflang entries dozens of times. That is a site bug.
- **A Gameface lobby sub view over the 3D hangar works:**
  - `hit_viewer` is such a sub view (see the hit_viewer section of the modpack README);
  - the page has a transparent background and takes the mouse;
  - its drags and wheel go to `CameraRelatedEvents.LOBBY_VIEW_MOUSE_MOVE`, so the stock hangar camera orbits;
  - closing it reloads the stock hangar.
- **Input on the current map.** The current map lives on the HUD page, which takes no input outside the HUD edit mode. That is why its modes, shell keys and hover ray are read in Python.

| | Option | Player experience | Effort | Crash risk | Beats |
| --- | --- | --- | --- | --- | --- |
| a | **ModsList → Gameface window with 2D projections.** Front, side, rear and top orthographic views cast through the hangar tank's collision from planes in its frame, drawn with canvas `fillRect`; hover reads the stored hit of the cell (no new ray); zoom and pan redraw | A clean, flat schematic, fully mouse driven, exact client numbers. But only fixed angles: no free orbit, so effective armour only for those four directions. A ±30° yaw slider means a re-cast. | **M–L.** Cost: a 100×50 view is 5 000 rays ≈ 0.4 s CPU ≈ 2 s of frames at 4 ms each; four views ≈ 8 s; then refine coarse-to-fine and cache per tank and modules. New window, new pure grid model; probe and shot rules reused. | **Low.** A plain Gameface page with `fillRect`, no SVG churn; Python ray load as today | Only adds flat schemes nobody has; it cannot beat Armor Inspector, tanks.gg or PROTanki on the 3D model. |
| b | **ModsList → CEF overlay with the site's 3D viewer** (§6 step 1) | A real 3D orbit and any tank. But it needs the network and loads a site; it is metered (`armor3d`, anonymous in CEF's cookie jar); Next.js 16 on Chromium 103 is unchecked; **today it fails with HTTP 418.** | **S** once the 418 is found, plus a lean embed route | **Low** (stock view) | It matches Armor Inspector's model (a browser app) without 25 MB or analytics, but has no crew or modules |
| c | **ModsList → recolour the hangar tank** (current HUD-page map) | Exact and instant on the real model. But it is not a screen: no panels for the mouse, Python hotkeys, a legend label only. It is what the owner rejected as the entry. | Built | Low–medium (measured fine) | On par with PROTanki's overlay, but without its screen |
| d | **Hybrid: ModsList → our own lobby sub view «Броня»** built like `hit_viewer`. The real 3D tank behind a transparent page; the existing `armor-map` canvas inside that page, not on the HUD page; side panels and camera presets in the page; optional projection thumbnails from (a) later; «3D на сайте» as a secondary button once (b) works | **A real screen from ModsList.** Drag to orbit, wheel to zoom, a hover card from page mouse events, a click in panels for mode, shell and distance; any tank through the preview swap; offline and instant. | **M.** The view plumbing (registration, frame, camera move, preview swap, close back to the hangar) comes from `hit_viewer`. Probe, grid, cells, legend and shot rules come from `armor_view`. New: the page layout and moving the two widgets. The Python hotkeys go away. | **Low–medium.** It is the sub view that already runs on 1.45, with canvas `fillRect` only. Risks: full-screen canvas at 2560/4K, the preview-swap pitfalls `hit_viewer` documented (dangling node adapters, camera limits), rebuilding while the camera animates | **Armor Inspector:** no browser, no download, no site outage, exact Lesta data and rules, Lesta-only tanks on day one. **PROTanki Reduced Armor** (the closest rival, same idea): Gameface instead of a Scaleform injection; the attacker's real shells and the client's shot rules instead of typed-in numbers; coarse-to-fine progressive build instead of a «Рассчитать» button and a progress bar; a legend; any tank without ShowVehicle. **tanks.gg / WG:** the same layout grammar, in game, on the real model. It still lacks crew and modules, HE maps and ram. |

## 9. Recommendation for the ModsList entry

**Build (d): the ModsList entry «Броня танков» opens an «Броня» lobby sub view, the `hit_viewer` way.** It replaces the HUD-page toggle as the entry. The carousel menu item opens the same view with that tank. In the vehicle preview, the view opens on the previewed tank, not the site.

**Layout** (one screen, the tank in the middle, in the grammar of §8.2):
- **Top left:** title, the tank name with tier and class, close (Esc).
- **Left column:** the tank picker (own garage first; search over all tanks swaps the preview the `hit_viewer` way) and the module configuration (turret and gun, from `VehicleDescr.installComponent`), as WG puts it.
- **Top centre:** mode tabs — **Номинал / Приведённая / Пробитие**.
- **Right column:**
  - the attacker block «own tank VS this tank» (tanks.gg): attacker = the selected own tank, changeable; shell chips; a distance slider 0–600 m;
  - under it, the vertical legend: mm stops, or the verdict colours with ricochet, overmatch (3-calibre) and spaced.
- **Bottom centre:** camera presets (front, front 30°, side, rear, top) through `HangarCameraManager.moveCamera`; the map rebuilds when the camera stops.
- **Hover card by the cursor:** part, plates along the ray, nominal, angle, effective, needed versus own penetration (±25 %), the verdict with its chance.
- **Footer button:** «3D на сайте».

**Order of work:**
1. **Spike, ½ day:**
   - the `hit_viewer` sub view with the `armor-map` canvas full screen at 1080p, 1440p and 4K;
   - drag-to-orbit and hover from the same page, told apart by the pressed button;
   - the preview swap of a tank the player does not own, answering rays.
2. **The view:**
   - move the map and legend widgets in;
   - read input from the page;
   - drop the Python hotkeys and the HUD labels.
3. **Later:**
   - the projection strip (a) as clickable thumbnails that snap the camera;
   - the site button after the HTTP 418 for the client's browser and the duplicated `Link` header are fixed.

**Out, as before:** Gameface WebGL, shipping our own geometry or crew and module models, anything in battle. Armor Inspector stays an idea reference only: its licence is personal, non-profit use. BattleHits (MIT) is the layout convention, not code we copy.
