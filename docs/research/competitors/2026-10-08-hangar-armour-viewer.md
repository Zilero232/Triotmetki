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
| PROTanki «анализ брони» | A tooltip by the cursor on the preview tank | Hover on the 3D model; no button (§2) |
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
