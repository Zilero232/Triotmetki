# Custom hangars — design spec

Date: 2026-10-06. Client: «Мир танков» RU 1.45.0.0 #2290 (`D:\Games\Tanki\version.xml`). Builds on
[2026-10-05-mod-community-hangar-settings.md](2026-10-05-mod-community-hangar-settings.md) §2 (options a/b1/b2/b3) and
the existing `hangar_space` feature ([apps/game/modpack/README.md](../../apps/game/modpack/README.md) «hangar_space —
hangar switcher»). This spec goes deeper on the client mechanics, the legal line, tooling and third-party hangars, and
turns option (b2) into a concrete phase-1 plan that needs no 3D artist.

Sources: decompiled client in `refs/wot-src-ru` (paths below are relative to `sources/res/`), the installed client's
packages (`D:\Games\Tanki\res\packages\*.pkg`, zip archives, listed and read only), web research (numbered links in
[Sources](#sources)). Packed BigWorld XML from the packages was decoded with a 60-line scratch decoder (format: magic
`0x62A14E45`, a string table, then elements with 28-bit end offsets and a 4-bit type: element, string, int, floats,
bool, blob). Everything marked **UNVERIFIED** has not been run in the client.

## 0. Summary

- A hangar is a **space folder** `res/spaces/<folder>/`. The client lists every folder whose `space.settings` has a
  `hangarSettings` section and loads one of them by path; `gui/hangars.xml` names the default (`h08_mt_hangar`) and
  the mode hangars. Mods add a hangar by shipping a new `res/spaces/<folder>/` inside a `.mtmod`, or change the
  default by overriding files; `mods/<version>/*.mtmod` is mounted **before** the game's packages, so a mod file wins
  over the stock file of the same path (`D:\Games\Tanki\paths.xml`).
- A space carries its **look in plain config**: `environments/<GUID>/environment.xml` (sun angle, time of day, sun and
  ambient colour, fog, HDR exposure and tone mapping, bloom, god rays, colour-grading LUT, lens flare, cloud shadows,
  wind, sky dome transform), `environments/environments.xml` (which environment is active), `space.settings`
  `hangarSettings` (vehicle position and heading, turret yaw, gun pitch, shadow direction) and the CGF prefab
  `content/HangarPrefabs/<space>/<space>_Tank.prefab` (camera start yaw/pitch/distance, limits, idle orbit, FOV). The
  client can **switch environments at runtime** (`BigWorld.EnvironmentSwitcher.instance().setMainEnvironment(name,
  tryActivate=True)`), the stock main hangar already ships four of them.
- **Phase 1 (now, no artist):** «Три отметки» hangar *looks* built on the client's own spaces: our own lighting, time
  of day, sky (any of the client's ~60 photometric skies by path), fog, colour grading (our own generated 16³ LUT),
  vehicle pose and camera start. Shipped as **recipes** (our values, JSON) that the manager applies to the player's own
  client files at install time and writes into a generated package; no Lesta byte is redistributed, and a recipe
  re-applies itself after every client patch. `hangar_space` grows a «Вид» gallery for the looks.
- **Phase 2:** third-party hangars only with the author's written permission covering a paid product, installed by the
  manager as optional large downloads, preferably from the author's own URL pinned by sha256. Fan hangars built from
  ripped WG/Lesta/other-game assets are out even with permission (the author has no rights to give).
- **Phase 3:** an original space only with a 3D artist and a rights assignment; an AI agent cannot author a new
  BigWorld space the 1.45 client loads: the only compiler is WG's proprietary Unified Editor Modders Edition (a Lesta
  1.37 build exists, 1.45 compatibility unknown); open-source `compiled_space` repacks only up to Lesta 1.42.

## 1. How hangars work on Lesta 1.45

### 1.1 Where spaces live

Each stock hangar is three packages (`res/packages/<space>.pkg`, `_bin.pkg`, `_hd.pkg`), mounted globally by
`paths.xml`. Sizes on this machine:

| Space folder | Scene in `gui/hangars.xml` | SD pkg | `_bin` | `_hd` |
| --- | --- | --- | --- | --- |
| `h08_mt_hangar` | `DEFAULT`, `BOOTCAMP`, `igrPremHangarPath` | 254 MB | 25 MB | 130 MB |
| `h08_mt_hangar_wt` | (server event override) | 117 MB | 34 MB | 74 MB |
| `h14_mt_wt_2025` | `WHITE_TIGER` | 68 MB | 34 MB | 36 MB |
| `h16_mt_museum` | `MUSEUM_OF_GLORY` (custom event mode) | 37 MB | 1 MB | 29 MB |
| `h00_armory_yard` | `ARMORY_YARD` (custom event mode) | 197 MB | 8 MB | 142 MB |
| `h33_comp7` | `COMP7` | 92 MB | 5 MB | 58 MB |
| `h33_battle_royale_2021` | `BATTLE_ROYALE` | 139 MB | 12 MB | 231 MB |
| `Hangar_mt_lite_editor` | — (developer space) | 91 MB | 1 MB | — |
| `h20_wot_bday` | `FESTIVAL` | not shipped in 1.45 | | |

What one space folder holds (`h08_mt_hangar.pkg` + `_bin.pkg`):

| File | Format | What it carries |
| --- | --- | --- |
| `spaces/<s>/space.settings` | packed XML | bounds, far/near plane, decals, SpeedTree, streaming, **`hangarSettings`** (below) |
| `spaces/<s>/space.bin` | binary (compiled scene: chunk items, models, lights, prefab instances) | 24.5 MB for h08; the geometry and placement — not editable without Lesta's tools |
| `spaces/<s>/*o.cdata_processed` | binary terrain chunks | 18 chunks of 100 m (`bounds` −3…2) |
| `spaces/<s>/environments/environments.xml` | packed XML | `activeEnvironment` + the list of environment GUIDs |
| `spaces/<s>/environments/<GUID>/environment.xml` | packed XML, ~6 KB | the look (§1.4) |
| `spaces/<s>/environments/<GUID>/probes/**` | DDS (8 MB pmrem cube + SH grid) | baked reflections / ambient for that environment |
| `spaces/<s>/environments/<GUID>/skyDome/*.model, .visual_processed, .primitives_processed` | packed XML + binary mesh | the sky dome; its material names the sky texture (`maps/skyboxes/Photometric_sky/2017_07_10_rgbm.dds`, shader `shaders/environment/sky_box_HDR.fx`) |
| `spaces/<s>/global_AM.dds`, `mmap.dds`, `outland/*`, `trees_tint_map.dds` | textures | terrain colour, minimap, outland height/normal maps |
| `spaces/<s>/flora.xml`, `particles.xml`, `decals.bin`, `road_map.bin` | XML / binary | vegetation, particle config, decals |
| `content/HangarPrefabs/<s>/*.prefab` | packed XML (CGF components) | camera rigs (`_Tank`), hero tank, posters (Battle Pass, Натиск, Tankist day), customization hide sets |
| `content/Hangars/**`, `content/Buildings/**`, `maps/**` | models, `.anim_processed`, `.seq`, DDS | the 3D content (characters, pigeons, buildings) |

### 1.2 What the client reads

- `gui/ClientHangarSpace.py` `_readHangarSettings()`: lists `ResMgr.openSection('spaces')`, and for every folder with
  `spaces/<f>/space.settings/hangarSettings` builds a `HangarConfig` (`gui/hangar_config.py`: `v_start_pos`,
  `v_start_angles`, `shadow_light_dir`, `vehicle_gun_pitch`, `vehicle_turret_yaw`, emblem alphas, camera capsule,
  plus `customizationHangarSettings`, `secondaryHangarSettings` and visual-script plans). The result is the module
  global `_HANGAR_CFGS` keyed by the lower-cased path; `constants.DEFAULT_HANGAR_SCENE` maps to the default path from
  `gui/hangars.xml` `hangar_scene_spaces/DEFAULT/space`. **Any folder with that section is a hangar** — this is how a
  mod's new space appears, and what `hangar_space` lists.
- `ClientHangarSpace.create()` picks the path (`_EVENT_HANGAR_PATHS` override → IGR → default), falls back to the
  default when `ResMgr.openSection(path)` is missing, then `BigWorld.addSpaceGeometryMapping(spaceId, None, path,
  visibilityMask, environment)` and creates the `HangarVehicle` entity at `_CFG['v_start_pos']` / `v_start_angles`.
- `gui/game_control/hangar_switch_controller.py`: `HangarSpaceSwitchController` keeps per-scene configs from
  `gui/hangars.xml` and a `DefaultHangarSpaceConfig` with **three override slots per premium flag: space path,
  visibility mask, environment**. The server fills them through event notifications `cmd_change_hangar`,
  `cmd_change_hangar_prem`, `cmd_change_hangar_alt` (JSON `{hangar, visibilityMask, environment, hotreload}`);
  `processPossibleSceneChange()` reloads the space through `IHangarSpaceReloader.changeHangarSpace(path, mask,
  environment, …)`; an environment-only change calls `BigWorld.EnvironmentSwitcher.instance().setMainEnvironment(env,
  tryActivate=True)` (`__updateEnvironmentForCurrentScene`). `hangar_space` already writes the space slot
  (`setSpaceIdOverride`); the environment slot (`setEnvironment`) is the same pattern.
- Visibility masks: `constants.HANGAR_VISIBILITY_TAGS` — layers `1`…`7`, ranked tags, regions; `BigWorld.
  setSpaceItemsVisibilityMask(spaceID, mask)` shows or hides tagged scene items (posters, seasonal props) without a
  reload.
- The customization view swaps to the space's `Customization` environment (`activateTempEnvironment('Customization')`,
  `gui/impl/lobby/customization/customization_main_view.py:130`) and back (`activateMainEnvironment()`). So
  environments are addressed **by their `<name>`**, not by GUID.
- `BigWorld.setColorGradingStrength()` (the graphics option) is the only runtime post-processing knob exposed to
  Python; fog, exposure, sun and sky have no Python API — they change only through environment files.

### 1.3 Environments the stock spaces ship (decoded `environment.xml` `<name>`)

| Space | Environments (`*` = active) | Notes |
| --- | --- | --- |
| `h08_mt_hangar` | `h08_mt_hangar_Autumn_TD2`*, `h08_mt_hangar_Autumn_TD1`, `h08_mt_hangar_Autumn_TD3`, `Customization` | TD1/TD3 differ in LUT (`h08_autumn.dds`, `35_steppes_02.dds`) and lighting; TD3 has rain drips |
| `h08_mt_hangar_wt` | `Environment_WT`*, `Customization` | |
| `h33_comp7` | `Night_N1_Light_shadow`*, unnamed (start 11.35) | |
| `h33_battle_royale_2021`, `h14_mt_wt_2025`, `h16_mt_museum`, `h00_armory_yard` | one or two unnamed | |

So the main hangar can already be shown in three daylight variants plus a neutral studio light **with no files at
all** — only an `EnvironmentSwitcher` call (UNVERIFIED that `setMainEnvironment` outside an event keeps the vehicle
and camera; the client itself does it on `cmd_change_hangar` environment changes).

### 1.4 What `environment.xml` controls (h08 `Autumn_TD2`, decoded)

| Block | Keys (examples) | What a look changes |
| --- | --- | --- |
| `day_night_cycle` | `starttime` (10.0 h), `deferred/angle` 60°, `angleZ` 330°, `forward/*`, `sunColor`, `sunLightColor`, `ambientColorForward`, `sunScale`, `isMoon`, `drawSunAndMoon` | time of day, sun height/azimuth, sun and ambient colour, moon instead of sun |
| `HDR` | `bloom/{threshold,amount,tint,dirtAmount}`, `environment/{sunlightLumMultiplier,ambientLumMultiplier,sunDiskLumMultiplier,skyExpositionOffset}`, `tonemappings` (Rexp/Filmic/LinearExp/GT, `active`), `colorCorrection/map` (LUT path), `camera` (physical exposure), `filmgrain`, `rainDistortion` | exposure, contrast, tone curve, colour grading, film grain, rain on lens |
| `Fog` | `deferred/forward {color, density, height, heightFalloff, startDistance, scatterColor}` | haze, colour of the air |
| `GodRays`, `LensFlare`, `DOF` | enable, intensity, colour | light shafts, flare, depth of field |
| `SSAO`, `SSShadows`, `Shadow` | radius, amplify, split count | contact shadows |
| `cloudsShadow` | `layer0/1 {texture, windDir, windStrength, tiling, shadowFactor}` | moving cloud shadows |
| `Weather/wind`, `Wetness` | wind speed, wet-surface look | wind on flags/trees, wet floor |
| `SkyDome` | `worldMatrix`, `worldMatrixForward` | sky rotation / height |
| `VFX` | `particlesSpaceConfigXml` | space particles |
| `PBS`, `AlbedoScaleSettings`, `overlayMaterial`, `dirt` | material response, snow/moss overlays | e.g. a snow overlay on the scene |

The client holds 125 colour-grading LUTs (`system/maps/post_processing/cube/*.dds`, 16³ volume DDS of 12–16 KB) and
about 60 sky textures (`maps/skyboxes/**`, e.g. `Photometric_sky/minsk_08_11_overcast_sunset_7_rgbe.dds` in the
Himmelsdorf package); every package is mounted, so an environment of the hangar may reference any of them by path.

### 1.5 Camera, vehicle and turntable

- Vehicle: `hangarSettings/v_start_pos` (h08: `-107 0 6.54`), `v_start_angles` (`-90 0 0`), `vehicle_turret_yaw`,
  `vehicle_gun_pitch`, `shadow_light_dir`. These are also editable **in memory**: `_HANGAR_CFGS[key]` is a Python dict
  of `HangarConfig`, read by `create()` with `copy.deepcopy` (UNVERIFIED that an edit before `processPossibleSceneChange`
  survives `initializeHangarsCFG()`, which re-reads only when `_HANGAR_CFGS` is still the empty `HangarConfig`).
- Camera: CGF components in `h08_mt_hangar_Tank.prefab` — `RotatorAroundTargetComponent` per mode (Tank: yaw
  −180…180, pitch −89…−4.5, distance 6…13, start yaw −7, pitch −4.5, distance 11; Platoon, ShiftedTank,
  ShiftedPlatoon), `IdleComponent` (the stock idle orbit: yaw period 100 s, pitch period 67 s, distance 6.5…10 —
  this is the "turntable": the camera, not the vehicle, circles when the player is idle), `ParallaxComponent`,
  `FovComponent` (90), `ShiftComponent`. Driven by `cgf_components/hangar_camera_manager.py`.
- A rotating vehicle would need a script (`ClientHangarSpace.moveVehicleTo` sets the model motor's matrix); not in
  scope — the stock idle orbit gives the same effect.

### 1.6 Sound

Hangar ambience and music are Wwise events (`MusicControllerWWISE`, `content/SoundZonePrefabs/` in the h08 package);
a new sound needs a Wwise soundbank, and Wwise's licence for a commercial product is per-title and paid. Phase 1 keeps
the stock sound.

### 1.7 How mods package and select hangars

Inspected archives (wot-zone.ru downloads for Lesta 1.45.0.0 / WG 2.4.0.2, unpacked in the scratchpad) and pages:

| Mod | Package contents | How it selects | Kind |
| --- | --- | --- | --- |
| «Стальной охотник» [H1] | `h33_battle_royale_2021.mtmod`, **2.8 KB**: only `res/scripts/client/gui/mods/mod_hangar_space.pyc` | monkey-patches `gui.ClientHangarSpace.getDefaultHangarPath` / `_getHangarPath` to return `spaces/h33_battle_royale_2021` | script-only, a client space (what our `hangar_space` does through the switch controller, more cleanly) |
| «Минималистичные ангары» HMHM by **Hellinger** [H2] | `HELL.HMHM.v2.mtmod`, 3.8–27.5 MB per variant (8 variants: Стандарт, Песок, Асфальт, Брусчатка, Камень, На луне, Pharaon, Imperium-of-Man): `res/spaces/hmhm/` (`space.bin` 10 KB, `space.settings`, 4 `.cdata_processed`, `environments/`), own model `res/HELL/*`, `mods/configs/hangar_replace.json` | patches `getDefaultHangarPath`, `_getHangarPath` and `_ClientHangarSpacePathOverride.setPath`; the JSON `{"target": "spaces/hmhm", "replace": ["spaces/h08_mt_hangar", "spaces/h33_battle_royale_2021", "spaces/h00_armory_yard", …]}` redirects stock **and event** spaces to its folder | **new space, original minimal geometry** |
| «Маковое поле» by **yarki33** [H3] | `yarki33_h04_remday_2015{,_content,_audioww,_particles}.mtmod` (229 MB rar): `res/spaces/h04_remday_2015/` (space.bin 4.2 MB, chunks, environments, outland, flora, decals), `res/content/Hangars/**`, `res/content/HangarPrefabs/**`, `res/scripts/arena_defs/h04_remday_2015.xml`, WG sound bank `h04_hangar_premium_2018.bnk`; plus `yarki33.hangarswitcher.core/openbeta` and OpenWG Gameface | obfuscated `mod_h04_remday_2015.pyc`, same `_getHangarPath` patch; a Gameface switcher (`kostik_hangar_switcher`, a renamed fork of poliroid's ModsList) | **new space, port of WG's 2015 Remembrance Day event hangar** |
| Hangar Manager / HangMan (goofy67 original [H4], current port `phantasm.hangarswitcher` v2.59, 2026-09-02) [H5][H6] | 454 KB: `mod_hangarswitcher.pyc` (44 KB, obfuscated), `HangarSwitcher.swf`, with ModsSettingsAPI + ModsList | switches among every hangar in the client and added ones; modes normal/random/nation/last battle; "a battle map position as a hangar"; previews by Ctrl+PrtSc into `hangar_defs` | switcher only |
| Ангар Near You Team by **Uotson/Valberton** [H7] | 172.9 MB rar, Lesta 1.45.0.0, updated 2026-09-18; "auto-replacement mod + free camera" | its own script | new space (cyberpunk night city, Battle Pass 2025 commanders on a stage, own music); the BP theme suggests reused Lesta assets (unverified) |
| Near_You «Олимп» (in their installer, 562.8 MB; the installer also lists «Уникальный ангар Near_You Team (1 637 МБ)») | — | — | new space (mountain), previous spec [9] and near-you-gap |
| Jove's modpack [H8] | whole pack 350–433 MB; aggregators mention «Новые ангары» without names | not found (the Inno installer was not unpacked) | not found |
| «Hangar Premium V1» (kinasura_RU, 89 MB, WG 1.19.1) [H9], «Hangar Premium V2» (olix_vameshu, 162 MB, WG 1.17) [H10] | `.wotmod` with a space folder | standalone or through HangMan | ports of WG's 0.8/0.9 premium hangar |

Findings: (1) **no mod edits `gui/hangars.xml`** — they add `res/spaces/<folder>/` and patch the path functions of
`gui.ClientHangarSpace`; (2) the "replace" style (HMHM) also swallows event hangars, which our `hangar_space`
deliberately does not; (3) most well-known hangars are **ports of WG event/premium hangars**; the only clearly original
one found is Hellinger's HMHM; (4) every mod hard-codes the client's private function names. A hangar that ships its
own folder appears in our `hangar_space` list by itself, so we already "support" all of them without code.

### 1.8 How hangars survive patches

- `mods/<version>/` is per client version: after a patch the client mounts a new empty folder; mods move or are
  reinstalled (our manager «moves the modpack after a client patch»).
- **New space folders** (third-party hangars) survive while the compiled formats (`space.bin` sections,
  `.cdata_processed`, `.primitives_processed`, shaders they reference) stay compatible; they break when Lesta changes
  a format or removes a shared texture/shader the space references. `space.bin` section layouts changed about 28
  times between 0.9.12 and 1.42, and the Lesta branch has its own since 1.22 (§3.4); HangMan's changelog is a list of
  "adaption for 1.11.1 / 1.16 / 1.17 / fix for 1.18.1.1", and the wgmods premium hangars stopped at WG 1.17 / 1.19.
  Current ports ship near-identical Lesta and WG builds, so both branches still read the same hangar formats today.
  No public report names a specific "broke because of space.bin version X". Script-only switchers survive as long as
  the client keeps the space and the private method names.
- **Overrides of stock files** (an `environment.xml`, `environments.xml`, `space.settings`, a prefab) are the fragile
  kind: the override hides whatever Lesta ships at that path in the new version (a re-baked environment, a new GUID,
  a seasonal re-skin), so a stale override can show a wrong or broken hangar. Lesta re-skins h08 seasonally
  (`h08_autumn_reskin2026.dds`): expect breakage several times a year. This is why phase 1 never ships overrides as
  static files (§5.2).

## 2. What can be built without a 3D artist

### 2.1 Levers, from cheapest to richest

| # | Lever | Mechanism | Files we produce | Lesta bytes shipped by us |
| --- | --- | --- | --- | --- |
| L1 | Pick a stock space | `setSpaceIdOverride` (exists: `hangar_space`) | none | none |
| L2 | Pick a stock environment of that space (h08: Autumn TD1/TD2/TD3, «Customization» studio light; Onslaught: night) | `DefaultHangarSpaceConfig.setEnvironment(isPremium, name)` + `EnvironmentSwitcher.setMainEnvironment(name, tryActivate=True)` | none | none |
| L3 | Vehicle pose (position on the floor, heading, turret yaw, gun pitch) | in-memory `_HANGAR_CFGS[path]` edit before the space loads; fallback `ClientHangarSpace.moveVehicleTo` | none | none |
| L4 | Camera start (yaw, pitch, distance within the stock limits), depth of field | `HangarCameraManager.moveCamera(...)` / `setDOFParams` after `onSpaceCreate` (the hit viewer already drives `moveCamera`) | none | none |
| L5 | Hide scene layers (posters, seasonal props) | `BigWorld.setSpaceItemsVisibilityMask(spaceID, mask)` with `HANGAR_VISIBILITY_TAGS` layer bits | none | none |
| L6 | **Our own environment** in a stock space: time of day, sun/moon, colours, fog, exposure, tone map, bloom, god rays, cloud shadows, wind, sky texture (any client sky by path), colour grading | a new environment folder next to the stock ones + the space's `environments.xml` listing it, then L2 | our values (a recipe); our own LUT DDS (original, 16³, ~16 KB) | none if generated on the player's PC (§5.2); ~6 KB of Lesta-structured XML per look if shipped as files |
| L7 | Own sky from a CC0 HDRI (Poly Haven) | sky dome material texture path → our RGBM DDS cube/lat-long | one 2–8 MB DDS per sky | none (the dome mesh stays the client's, referenced or copied locally) |
| L8 | Small original props (our «///» sign, a marks banner) placed in the scene | needs a new model and a placement in `space.bin` (compiled) — or a `BigWorld.Model` added by script at a fixed position, the way the hit viewer adds BattleHits models | `.model/.visual/.primitives` of our own | none |
| L9 | A battle map as a hangar (add `hangarSettings` to `spaces/<map>/space.settings`) | the client would list it (§1.2) | an override of a **battle map's** settings | — rejected: touches a file every battle on that map loads, no hangar camera prefab in a map (UNVERIFIED), the whole map streams into memory |

L1–L5 need no files at all. L6–L7 are the "config-derived hangar": the same geometry, a clearly different mood
(night with moon and blue fog, golden sunset, overcast steel, studio). L8 is an extra that needs a few simple models
(a modeller-hour each, or CC0 kits); scripted models are how BattleHits draws in the hangar, so it is a known path.
Reflection probes are baked per environment by Lesta's editor; a new environment without matching probes keeps the
reflections of the environment whose probes it copies (fine for a sunset or overcast variant of daylight, visibly off
for a full night look — the night look must keep the sky dark enough that the vehicle reflections read as moonlight).
**UNVERIFIED:** whether an environment folder without `probes/` loads (fallback to the global probe or black); the spike
in §5.4 answers it before any look is promised.

### 2.2 What is allowed (legal)

Lesta's EULA ([legal.lesta.ru/eula](https://legal.lesta.ru/eula/), fetched 2026-10-06):

- 4.2.1 — no copying or distribution of the game's «текстовые, графические, аудио- или видеоматериалы» without written
  consent;
- 4.2.2 — no «модифицировать Игру… создавать производные продукты на базе Игры… без письменного согласия»;
- 4.2.5 — no distribution «в коммерческих или некоммерческих целях» of the game's data, audiovisual elements and other IP
  «(кроме случаев, разрешенных Леста Игры)».

Against that, Lesta openly tolerates mods: its own installer МОСТ («Игровые модификации… давно стали важной частью
«Мира танков»», [tanki.su news 2025-10-30](https://tanki.su/ru/news/notifications/most-mt/)), МОСТ carries hangar mods
(«Лесной ангар», «Минималистичный ангар», «Премиум ангар 2-го поколения», updates of 06.05.2026, previous spec [10]),
and the forbidden list ([support 15152](https://lesta.ru/support/ru/products/mt/article/15152/), updated 2026-03-02)
says «Мы абсолютно не против модов, действующих только в Ангаре (не во время сражения)». The content-creator rules say
paid use of game content needs Lesta's explicit permission («Прямая продажа… Игрового контента на какой-либо возмездной
основе допускается только с нашего прямого разрешения», [legal.lesta.ru/contributors-content-guidelines](https://legal.lesta.ru/contributors-content-guidelines/)).
`D:\Games\Tanki\Licenses.txt` also shows that some client content is third-party licensed (SpeedTree, Megascans ©
Epic Games), and every tanki.su page notes the game is built on third parties' IP.

| What | Verdict for «Три отметки» (a free modpack next to a paid Plus subscription) |
| --- | --- |
| Runtime choice of stock spaces/environments, pose, camera, layers (L1–L5) | **Allowed** in practice: a hangar-only script, same footing as every other component (fair-play audit verdict «allowed (H)»). |
| Our own values applied to the player's own client files **on the player's PC** (generated package, L6) | **Lowest-risk form of L6**: we distribute only our numbers and our own art; nothing of Lesta's leaves Lesta's client. Still a «modification» under 4.2.2, which every mod is; tolerated. |
| Shipping modified Lesta XML (`environment.xml`, `environments.xml`, `space.settings`, prefabs) as files | **Tolerated community practice** (hangar mods, sound mods, XVM configs do it), formally 4.2.2/4.2.5. Acceptable only in the free part and only if the generator route fails. |
| Shipping copies of Lesta/WG binary assets (models, textures, `space.bin`, probes) | **Not allowed** for us — 4.2.1/4.2.5, «commercial or non-commercial», plus third-party licensed content inside. Never, paid or free. |
| Third-party fan hangars | Only with the author's written permission covering a paid product **and** only when the hangar is the author's own work (no ripped WG/Lesta/other-game assets). §4. |
| Any of this behind the paywall (Plus-only hangar) | **No.** Hangars stay in the free modpack; Plus never unlocks them. Selling access to anything built on Lesta's scene is exactly «возмездное использование Игрового контента». Ask Lesta in the same letter as the Plus model ([Plus spec §6](2026-09-26-plus-subscription.md)) before even advertising hangars next to Plus. |

## 3. Tooling

Researched 2026-10-06; koreanrandom.com answers 403/Cloudflare, so its topics were read through web.archive.org.

### 3.1 Packed XML (configs)

| Tool | Licence | Updated | Reads / writes | Use for us |
| --- | --- | --- | --- | --- |
| **wg-toolkit-rs** (theorzr; Rust library + CLI, crate `wg-toolkit` 0.4.1) [T1] | MIT | push 2026-09-15 | packed XML read **and** write; partial `space.bin` sections (BWTB, BWST, BWT2, BWSG, BWCS, BWAL) | **the manager's packed-XML codec** («packages before custom code»: use it instead of writing `packed_xml.rs`; check its current crate release and `zip` compatibility first) |
| XmlUnpacker.py / XmlPacker.py in SkepticalFox's add-ons [T2] | WTFPL | 2026-08 | read + write (Python) | reference; Python 3 — not for the modpack tooling |
| BWXML (hedger, C++) [T3] | none stated | 2017 | unpack + pack | no |
| WoTModTools (katzsmile, C#) | CC0 per README | 2017 | unpack | no |
| XML_Editor (mikeoverbay, VB.NET) | none stated | 2024-11 | edit | no |

Nothing on npm or PyPI (`wotxml`, `bwxml`, `xmlunpacker` are 404).

### 3.2 Models

| Tool | Licence | Updated | What | Writes game files |
| --- | --- | --- | --- | --- |
| WoT-Blender-Toolkit (wotcuk, Blender 4.3+) [T4] | GPL-3.0 | 2026-09-11 | import `.model/.visual_processed/.primitives_processed/.anim`, export `.model/.visual/.primitives` + DDS into `res_mods` | yes, mostly vehicles; world models only "as a tank" or simple glow; the author calls it buggy |
| Tank Exporter (mikeoverbay «Coffee_», VB.NET) [T5] | none stated | 2026-05 | `primitives_processed/visual_processed` ↔ FBX/glTF, wotmod packing | yes, hull/turret; binary distributed via tnmshouse.com |
| Tank-Exporter-PY (TEPY) [T6] | none stated | 2026-07 | writes `.primitives_processed` via Blender | yes (per README) |
| WoT-Blender-Addons (SkepticalFox / Simi4: tank_viewer, map_viewer, `compiled_space`) [T2] | WTFPL | 2026-08-02 | import vehicles and **maps** into Blender | no model export |
| io_scene_core (Pyogenics) [T7] | MIT | 2025-04 | import; README almost empty | unknown |
| BigWorld-Tools-for-Blender (Ozzzmanov) [T8] | none stated | 2026-01 | "BigWorld asset import" | unverified |
| Blender-SRT-Loader (qirashi) [T9] | GPL-3.0 | 2026-05 | SpeedTree `.srt` v6 import | import only |
| wot-model-converter (SkaceKamen) | none stated | 2016 | to OBJ | outdated |
| PjOrion | closed source, licence unverified | — | Python 2.7 IDE/decompiler/obfuscator; deobfuscator [T10] | unrelated to spaces |

No project named "io_scene_wot", "WoTMapsToUnity" or "wotmapsviewer" was found.

### 3.3 Spaces (`space.bin`, chunks)

| Tool | Licence | Updated | What | Writes `space.bin` |
| --- | --- | --- | --- | --- |
| **Unified Editor Modders Edition** (WG's official editor for modders, formerly the hangar World Editor; mirror Open-WG/WoT.UnifiedEditor) [T11][T12] | proprietary, published by a WG employee "as is" | v2.2.0.0, 2026-03-17 (WG 2.2); a Lesta build «Unified Editor - Modders Edition.1.37.exe» is mentioned, no direct link found | edits space **sources** (`.chunk`, `.cdata`, `space.settings`); `asset_pipeline/batch_compiler.exe` (`space_converter.dll`, `wot_space_converter.dll`) compiles them; Maya exporter `visual.mll`; ships the source of a base hangar `res/spaces/hangar_v4` | **yes**: `compile_spaces.cmd` → `.jit/output/spaces/<map>` |
| `compiled_space` (SkepticalFox, Python) [T2][T13] | WTFPL | GitHub 2026-08 | `unp_to_dir`, `unp_for_world_editor`, `from_dir`, `save_to_bin`; ~30 section types (BWT2, BSMI, BSMO, BWSG, BWWa, GOBJ…) | **yes** (repack); version table WG ≤ 1.28, Lesta 1.23/1.31/1.32/1.37/1.39/**1.42** — 1.45 not listed |
| WoT-Space-Parser (Newmcpe, Rust) [T14] | WTFPL | 2026-05 | `space.bin`, primitives, Havok, terrain → OBJ/PNG + web viewer | no |
| nuTerra (mikeoverbay) [T15] | none stated | 2026-10-01 | offline map viewer | no ("never writes to the game") |
| BigWorld OSE 14.4.1 source (2014) [T16] | MIT-0-like text, © BigWorld Pty Ltd; officialness unverified | 2025-03 | 2014 engine incl. world editor | formats of 2014 — useless for 1.45 |

### 3.4 How hangar makers actually work

- In 2018 a WG employee published the internal hangar editor for modders (Girls und Panzer and Independence Day
  garages were made with it); the Unified Editor replaced it and is kept up to date (Mixaill, the XVM team) [T12].
- The client holds only compiled `space.bin`, which the editor cannot open; makers start from the bundled `hangar_v4`
  source, or decompile a client hangar with SkepticalFox's `unp_for_world_editor` [T12].
- Client models loaded into the editor by dropping `_processed` from the names worked on 1.26, no longer in 2025
  (page 23 of the same topic) [T12].
- Many popular "hangars" are re-dressed WG hangars (GrebTV's pack credits «WG+KasykC» [T17], unverified because the
  archived page is garbled) or battle maps turned into hangars [H-wotspeak]; runtime switchers use hangars already in
  the client [H-switch].
- `space.bin` layouts changed ~28 times between 0.9.12 and 1.42; WG and Lesta branches diverged after 1.22 (Lesta's own
  BSMI, BWLC, GOBJ, BSMA). A compiled hangar is tied to the client branch and must be recompiled after format changes.

### 3.5 Can an AI agent do it?

| Task | Verdict |
| --- | --- |
| (a) Edit configs of existing spaces (environment, `space.settings`, prefabs) | **Yes.** Scriptable end to end (wg-toolkit-rs, our decoder); this is phase 1. Tuning the look still needs a human eye on screenshots from the dev loop. |
| (b) Swap textures / models in an existing space keeping paths | **Textures yes** (a DDS at the same path), but overriding Lesta's textures means owning a replacement for every path and re-checking each patch. **Models partly** (vehicle-oriented exporters, world models raw). Moving objects inside `space.bin` only via `compiled_space` (Lesta ≤ 1.42). Not planned. |
| (c) A brand-new space the 1.45 client loads | **No, not with open source.** Only the proprietary Unified Editor (a Lesta build for 1.37, compatibility with 1.45 unknown, GUI, undocumented `.chunk`), which an agent could at best drive through `compile_spaces.cmd` from a human-made scene. Phase 3 therefore needs a person who knows that editor, and the editor's own terms must allow commercial-adjacent use (unverified; it is WG's tool, not Lesta's). |

**Agent skills** (`npx skills find`, nothing installed; full output in the scratchpad `tools/skills.txt`): nothing for
World of Tanks, BigWorld or game modding. The nearest are Blender helpers — `vladmdgolam/agent-skills@blender-mcp`
(drives a local Blender through the blender-mcp server), `roble3/cc-blender-skill@blender-modeling` and
`@blender-materials`, `sfkislev/flue@Blender`, `freshtechbro/claudedesignskills@blender-web-pipeline` — useful only in
phase 3 for simple original props (with WoT-Blender-Toolkit for the export). None needs credentials; none is worth
installing for phase 1.

## 4. Third-party hangars

### 4.1 Explicit licence or stated permission

**None found.** No hangar page checked (wot-zone.ru, wotsite.net, wgmods.net, forum.tanki.su, protanki.tv, the МОСТ
curators' topic) carries a licence or a «можно в сборки» statement. wot-zone only says the mods «взяты из открытых
источников и принадлежат их владельцам». Without a written permission everything below is all-rights-reserved, and our
assets rule ([apps/game/modpack/assets/README.md](../../apps/game/modpack/assets/README.md)) needs a licence that allows
a paid product.

### 4.2 Candidates

**May ask** (the author's own work as far as we can tell; provenance still to be confirmed in the request):

| Hangar | Author | Link / previews | Size | Last client | Notes |
| --- | --- | --- | --- | --- | --- |
| «Минималистичные ангары» HMHM v2 (8 variants) | Hellinger | [H2]; previews `https://wot-zone.ru/wp-content/uploads/2017/11/hangar-clear1.jpg` … `-4.jpg` | 3.8–27.5 MB per variant | Lesta 1.45.0.0 / WG 2.4.0.2 | **Best fit**: original minimal space, tiny, good for weak PCs. Its own script redirects event hangars too — we would ship only the space folder and let `hangar_space` select it. Contact not found; ask through the publishing site or the mod's readme. |
| «Минималистичный ангар с танком на подиуме» (+ V2) | Leonardo_Shpah | [forum.tanki.su/topic/2208423][F2208423] | not stated | 1.41 → updated in МОСТ 06.05.2026 | **never**: WG and Lesta textures, Hellinger's script (§4.4). |
| «Лесной ангар» | MatroseFuchs (МОСТ curator posts) | previous spec [10] | not stated | МОСТ, 1.45 | **never**: yarki33's port of WG's 1.0 hangar (§4.4). |
| Ангар Near You Team | Uotson / Valberton | [H7]; previews under `https://wotsite.net/cache/resized/` | 172.9 MB | Lesta 1.45.0.0 (2026-09-18) | Branded for a competitor and likely built on Lesta's Battle Pass 2025 assets: ask only about the authors' **other**, unbranded work. |

**Do not ask / cannot ship** (ports of WG or Lesta assets — the modder has no rights to give; or no need):

| Hangar | Why |
| --- | --- |
| «Маковое поле» `h04_remday_2015` (yarki33) [H3] | WG's 2015 Remembrance Day hangar + WG sound bank |
| «Hangar Premium V1» (kinasura_RU) [H9], «Hangar Premium V2» (olix_vameshu) [H10] | WG's 0.8/0.9 premium hangar |
| «Мастерская WG», «Зимний праздничный», «День победы», «Бесплатный премиум ангар» (wot-zone archive, 0.9.22–1.12.1) | WG event hangars, abandoned |
| «Стальной охотник» script [H1] | the space is already in the client; `hangar_space` lists it |
| Hangar Manager / HangMan, yarki33 Hangar Switcher [H4][H5][H6] | switchers; `hangar_space` is ours |
| Near_You «Олимп», Jove's hangars | competitors' branded packs; names and authors of Jove's hangars not found |

### 4.3 Permission request (ru)

Adapted from [docs/ops/mod-authors-outreach.md](../ops/mod-authors-outreach.md); a yes is filed under
`docs/ops/permissions/<author>-<hangar>.md`.

> **Тема:** Ангар «{название}» в модпаке «Три отметки»
>
> Здравствуйте, {имя}!
>
> Я делаю модпак «Три отметки» для «Мира танков» (triotmetki.ru): визуальные моды в рамках правил честной игры и сайт
> статистики. Модпак бесплатный и ставится нашим менеджером модов; у сайта есть платная подписка, и модпак входит и в
> бесплатную, и в подписочную версию (сами ангары подписка не открывает — они доступны всем).
>
> Хотим предложить игрокам ваш ангар «{название}» как отдельный необязательный компонент: менеджер скачает его только
> тем, кто его отметит, — {с вашей страницы по прямой ссылке / с нашего сервера, если вам так удобнее}. Файлы не
> меняем, кроме технического: без вашего скрипта выбора ангара, выбирает наш компонент «Выбор ангара».
>
> Чтобы всё было честно, два вопроса:
>
> 1. Можно ли так распространять ангар (бесплатная и подписочная версии модпака)?
> 2. Все модели и текстуры в нём сделаны вами или взяты из источников со свободной лицензией (не из клиента игры и не
>    из других игр)?
>
> Взамен: «Автор: {имя}» со ссылкой на ваш канал в карточке компонента, в менеджере и на странице модпака на сайте;
> удаление в течение 7 дней по вашей просьбе. {По желанию: доля дохода — обсудим.}
>
> Если согласны, ответьте, пожалуйста: «Разрешаю распространять ангар „{название}“ в модпаке „Три отметки“ (бесплатная и
> подписочная версии) с указанием авторства; ангар сделан мной».
>
> Спасибо!
> {подпись, triotmetki.ru, контакт}

### 4.4 Licence deep-dive: "copy it if the licence allows" (2026-10-06)

Question: can we simply ship someone's hangar when its licence allows redistribution? Answer: a licence is
**necessary but not sufficient**. It covers only what its author owns. A hangar is two layers, and both must be clean:

1. **The author's layer** — their own geometry, textures, scripts and configs. Needs a licence or a written permission
   that allows redistribution by a company with a paid product (our modpack is free, the platform sells Plus). MIT,
   CC0, CC-BY (with attribution) qualify; **CC-BY-NC does not** (a free component that promotes a paid subscription
   is "directed towards commercial advantage"); GPL is workable only with the editable sources shipped too. A forum
   phrase like «можно использовать в сборках» is an open licence in spirit, but it should be confirmed in writing with
   the paid-product case named (template §4.3).
2. **The game's layer** — any WG/Lesta bytes inside the package (ported event hangars, copied textures, baked probes
   from WG scenes, sound banks, commander models). Nobody but Lesta can license these. Redistributing them breaches
   EULA 4.2.1/4.2.5 «в коммерческих или некоммерческих целях», whatever the modder wrote. Even an MIT `LICENSE` in a
   GitHub repo of a ported hangar would be void for those files. *Referencing* files that already sit in the player's
   client (a texture path in our config) is a different thing: nothing is redistributed (§2.2).

Results of this pass (packages downloaded and hashed against every file in the installed 1.45 client's
`res/packages/*.pkg`; WG's 1.0 hangar files compared from a public mirror; all pages seen 2026-10-06):

- **No hangar anywhere carries a licence or a «можно в сборки» statement.** Checked: the forum threads of Hellinger
  ([745873][F745873]), Leonardo_Shpah ([2208423][F2208423]),
  yarki33 ([2214436][F2214436]); the wot-zone, wotsite, protanki.tv hangar catalogues;
  the Near You page; Jove's posts; the GitHub repository search (only code repos turn up: offline-hangar servers,
  carousel and clock mods; no repo ships a hangar space under any licence); ModDB (its hangar mods are for WoT Blitz).
  The HMHM v3.3 archive's readme has install steps only. The only kind of clean, licensed hangar does not exist yet.
- **HMHM v3.3 (Hellinger) is mostly his own work but ships two WG files.** Own: the disc model `res/HELL/HELL.*`
  (8 KB primitives), its four DDS textures (a grid on dark teal), prefabs, the script; none matches any client file.
  WG: `environments/B699F57C-…/probes/global/pmrem.dds` (2 MB) and `skydome/skybox.model` are **byte-identical** to
  WG's `hangar_v3` (the 1.0 forest hangar) files of the same environment GUID, and `environment.xml` is that
  environment's config edited (157 of 161 tags, all texture paths shared). Terrain tiles, lens and sky textures are
  only referenced from the player's client. So HMHM is shippable only as a **clean build** (our own probe, no
  `hangar_v3` skybox) plus Hellinger's written permission.
- **Leonardo_Shpah's «Минималистичный ангар с танком на подиуме» is not his own work** and moves to "cannot ship":
  its loader `JSON_hangar_script.mtmod` is Hellinger's `mod_HMHM.pyc` byte for byte; its podium and floor use WG
  `hangar_v4` textures (`hv4_104_HeroPodium_*`, `hv4_013_Floor_*`) and 8 textures byte-identical to Lesta's
  `shared_content*.pkg` (`Dirt_CaucasusBridge_02`, `Dirt_Oil_01_DM`, `Metal_Bare_01_1024_*`).
- **«Лесной ангар» is yarki33's port of WG's 1.0 hangar** («Ангар… из 1.0», 2026-01-15; MatroseFuchs only curates it
  in МОСТ); its assets sit in `github.com/kostikmalish/YarkiModpackAssets` (no LICENSE) next to the WG
  `h04_remday_2015` space and WG sound banks. Cannot ship.
- Others: «Маковое поле» (WG 2015 event hangar, wot-zone credits «Waraming»), Hangar Premium V1/V2 (WG premium),
  Miku Hangar by TaLLIePO on protanki.tv (overrides WG `hangar_v3`; Vocaloid characters are a third party's IP
  besides), Protanki's own minimal hangar (4.87 MB, archive not reachable, no licence, competitor-branded), Near You
  (Battle Pass 2025 commanders on a stage: Lesta models, inferred from the page), Jove's «Менеджер Ангаров» (phantasm's
  HangMan, a switcher over client and ported hangars).

| Hangar | Author | Licence / permission | Own vs game assets | Commercial OK? | Client | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| HMHM v3.3 (8 floor variants) | Hellinger (vk.com/hell_inger) | none ([745873][F745873]; readme: install steps only) | own model, textures, script; **WG `hangar_v3` probe + skybox.model shipped**; config derived from WG | not granted | Lesta 1.45 `.mtmod` only, 3.8 MB, `space.bin` compiled by the author, updated 2026-09-03 | **ask author** for a clean build + written permission |
| Минималистичный ангар с танком на подиуме | Leonardo_Shpah | none ([2208423][F2208423]) | WG `hv4_*` + Lesta `shared_content` textures; Hellinger's script | — | Lesta 1.45, 25 MB | **never** |
| Лесной ангар (из 1.0) | yarki33 | none ([2214436][F2214436]) | port of WG 1.0 hangar | — | Lesta 1.45, ~286 MB | **never** |
| Маковое поле `h04_remday_2015` | yarki33 (port) | none | WG event hangar + WG `.bnk` | — | Lesta 1.45 / WG 2.4, 173 MB | **never** |
| Hangar Premium V1 / V2 | kinasura_RU / olix_vameshu | none ([wgmods 5906](https://wgmods.net/5906/), [3909](https://wgmods.net/3909/)) | WG premium hangar | — | WG 1.19 / 1.17 `.wotmod` | **never** |
| Miku Hangar | TaLLIePO | none ([protanki.tv](https://protanki.tv/ru/mods/anime-angar-miku-hangar)) | WG `hangar_v3` + third-party anime IP | — | 1.29 / WG 1.26, 111 MB | **never** |
| Минималистичный ангар PROTанки | ProTanki | none ([protanki.tv](https://protanki.tv/ru/mods/minimalistichnyi-angar-protanki)) | not inspected | — | 1.45 / 2.4, 4.9 MB | competitor's; **don't ask** |
| Ангар Near You Team | Uotson / Valberton | none ([wotsite](https://wotsite.net/angary-dlya-tankov/12552-angar-near-you-team-dlya-world-of-tanks.html)) | Lesta BP 2025 commanders (inferred) | — | Lesta 1.45, 173 MB | **never** |
| Jove's hangars | phantasm's HangMan (switcher) | none | client and ported hangars | — | — | **n/a** (`hangar_space` is ours) |

What shipping HMHM would take technically: one 3.8 MB `.mtmod` per client build, Lesta only (the author states it
runs only on «Мир танков»); his `space.bin` and `.cdata_processed` are compiled for the current client and only the
author can recompile them after a format change (we have no 1.45 compiler, §3.3); we drop his redirect script and
`hangar_replace.json` and let `hangar_space` select `spaces/hmhm`; we replace the WG probe with one we bake ourselves
(a near-black studio cube, or from a CC0 Poly Haven HDRI) and drop the `hangar_v3` skybox reference (that space is not
in the Lesta client anyway, so the dome is already missing); spike S4 (§5.4) answers whether a hand-made probe loads.

[F745873]: https://forum.tanki.su/topic/745873-14200-hmhm-v3-%D0%BC%D0%B8%D0%BD%D0%B8%D0%BC%D0%B0%D0%BB%D0%B8%D1%81%D1%82%D0%B8%D1%87%D0%BD%D1%8B%D0%B9-%D0%B0%D0%BD%D0%B3%D0%B0%D1%80/
[F2208423]: https://forum.tanki.su/topic/2208423-14100-%D0%BC%D0%B8%D0%BD%D0%B8%D0%BC%D0%B0%D0%BB%D0%B8%D1%81%D1%82%D0%B8%D1%87%D0%BD%D1%8B%D0%B9-%D0%B0%D0%BD%D0%B3%D0%B0%D1%80-%D1%81-%D1%82%D0%B0%D0%BD%D0%BA%D0%BE%D0%BC-%D0%BD%D0%B0-%D0%BF%D0%BE%D0%B4%D0%B8%D1%83%D0%BC%D0%B5/
[F2214436]: https://forum.tanki.su/topic/2214436-14300-%D0%BB%D0%B5%D1%81%D0%BD%D0%BE%D0%B9-%D0%B0%D0%BD%D0%B3%D0%B0%D1%80-%D0%B8%D0%B7-10/

## 5. Recommendation and plan

### 5.1 Recommendation

1. **Phase 1a (code only, ~3 days):** `hangar_space` 0.2.0 gets *looks* on top of the space list: a look = stock space +
   stock environment + vehicle pose + camera start + hidden layers (levers L1–L5). Ships at once, no files, no legal
   question, no patch upkeep beyond names.
2. **Phase 1b (~2 weeks):** «Три отметки» looks with **our own environments** (L6, later L7), produced by the
   **manager on the player's PC** from recipes, plus our own LUTs in a small normal package. This is the "our hangar"
   the user asked for, honestly sized: the stock main hangar in our moods (Ночь, Закат, Сталь, Студия «///»), not a
   new building.
3. **Phase 2:** third-party hangars only after written permission (§4.3), as optional manager downloads.
4. **Phase 3:** an original space only with a 3D artist under a rights assignment (§3 explains why an agent cannot).
5. Hangars are never part of Plus; Lesta is asked about hangars in the Plus letter.

### 5.2 Why the manager generates the files

Shipping `environment.xml` copies is the community norm, but it (a) redistributes Lesta-authored files, (b) freezes
them: after a seasonal re-skin our stale copy hides Lesta's new one (§1.8). A **recipe** — "clone environment
`h08_mt_hangar_Autumn_TD2` of `spaces/h08_mt_hangar` as `otm_night`, set `day_night_cycle/starttime` = 23.5,
`isMoon` = true, `HDR/colorCorrection/map` = `system/maps/post_processing/cube/otmetki/night.dds`, …" — holds only our
values. The manager reads the stock files from the player's own packages (zip; packed XML decoded), applies the
recipe and writes a generated package into `mods/<version>/`. After every client patch (the manager already detects
it and migrates) the recipe is applied again to whatever Lesta ships now; a recipe whose target is gone is skipped and
reported, never half-applied. Copies the generator makes from the player's own client (the `probes/` of the cloned
environment, the sky dome mesh) never leave that PC, so nothing of Lesta's is distributed by us.

Fallback if the generator slips: ship the derived XML statically in the free package, pinned to one client build, and
drop it on the next patch until regenerated by hand.

### 5.3 Phase 1a — files

Feature layout per [apps/game/modpack/CLAUDE.md](../../apps/game/modpack/CLAUDE.md) (pure `model/`, glue in `client/`):

| File | Change |
| --- | --- |
| `features/hangar_space/model/looks.py` (new) | Pure: the look table (`id`, `space`, `environment` name, `pose {pos, yaw, turret, gun}`, `camera {yaw, pitch, dist}`, `hide_layers`), `available_looks(spaces, environments)` (a look shows only when its space and environment exist; generated looks are found by their `otm_` environment names), `look_plan(look, current)` → what to write and whether to reload or only switch the environment, camera values clamped to the stock limits (`hangar_tank_limits` constant). |
| `features/hangar_space/model/constants.py` | `LOOKS` (1a: «Осень: утро» TD1, «Осень: день» TD2, «Осень: пасмурно» TD3, «Студия» `Customization`, «Натиск: ночь» `Night_N1_Light_shadow`), `ACTION_LOOK`, `GENERATED_PREFIX = 'otm_'`, `PREVIEWS` for looks (`img://gui/maps/icons/otmetki/hangar_space/<look>.png`). |
| `features/hangar_space/client/environment.py` (new) | `environment_names(space_path)` (reads `spaces/<s>/environments/environments.xml` and each `environment.xml` `<name>` through `ResMgr`), `write_environment(switcher, is_premium, name)` (`_defaultHangarSpaceConfig.setEnvironment` / `discardEnvironment`), `switch_environment(name)` (`BigWorld.EnvironmentSwitcher.instance().setMainEnvironment(name, tryActivate=True)`), `apply_pose(space_key, pose)` (in-memory `_HANGAR_CFGS`), `apply_camera(camera)` (`HangarCameraManager.moveCamera`), `apply_layers(mask)` (`BigWorld.setSpaceItemsVisibilityMask`). Constants in `client/constants.py`. |
| `features/hangar_space/client/__init__.py` | `apply()` also writes the environment slot and runs the look's pose/camera/layers on `onSpaceCreate`; owned-slot logic as for the space (a server event environment is never overwritten — `override_changes` extended to the environment slot). `ui_page()` adds a «Вид» section (gallery rows per available look) above the spaces; `ui_action('look', id)`. |
| `features/hangar_space/settings/constants.py` | `DEFAULTS = {'space': '', 'look': ''}`; `look` normalised to a known id (or empty); `ADVANCED` unchanged. |
| `features/hangar_space/i18n/strings.py` | `hangar_space_look_<id>`, `_hint`, `hangar_space_section_looks`, «Вид меняется сразу» note (ru/en). |
| `features/hangar_space/tests/test_looks.py` (new) | availability, plan, clamping, owned environment slot, generated-look discovery. |
| `assets/otmetki/hangar_space/` + `assets.json` set `hangar_space_previews` | our own in-game screenshots of each look (taken with the dev loop, cropped 16:9), origin `original`; screenshots of the game are fan content of Lesta's scene — used only as previews, never sold. |
| `catalog/catalog.json` `hangar_space` | description updated (looks), preview → a look screenshot; version bump left to the user. |
| `CHANGELOG.md` | `## hangar_space 0.2.0` ru/en: one line per change. |
| `README.md` «hangar_space» | looks, environment slot, UNVERIFIED list. |

### 5.4 Spike before 1b (1 day, dev loop, `bun run dev:install hangar_space`)

| # | Question | Pass |
| --- | --- | --- |
| S1 | `setMainEnvironment('h08_mt_hangar_Autumn_TD3', tryActivate=True)` in the loaded main hangar | the look changes live, vehicle and camera stay |
| S2 | the environment slot + `processPossibleSceneChange` on hangar entry | the chosen environment survives a reconnect and battle return |
| S3 | a mod package with `spaces/h08_mt_hangar/environments/<new GUID>/environment.xml` **as plain text XML** + `environments.xml` listing it | listed by name, switchable |
| S4 | the same without `probes/`, and with probes copied from TD2 | which one renders acceptably |
| S5 | our 16³ RGBA8 volume DDS as `colorCorrection/map` | graded image, no warning in `python.log` |
| S6 | in-memory `_HANGAR_CFGS` pose before reload; `moveCamera` start | vehicle at the new pose; camera at the start values |
| S7 | `setSpaceItemsVisibilityMask` with layers off | posters hidden, nothing else lost |
| S8 | FPS on the «weak PC» profile (minimum settings, forward renderer) for each look vs stock | ≤ 5 % difference |

### 5.5 Phase 1b — files

**Modpack (recipes and our own art):**

| File | What |
| --- | --- |
| `apps/game/modpack/hangars/looks/<id>/recipe.json` (new folder `hangars/`) | `{id, base: {space: 'spaces/h08_mt_hangar', environment: 'h08_mt_hangar_Autumn_TD2'}, name: 'otm_<id>', set: [{path: 'day_night_cycle/starttime', value: '23.5'}, …], copy_probes: true, pose, camera, hide_layers, clients: ['1.45.0.0']}`; only paths in an allow-list (the §1.4 blocks; never `space.settings` bounds, never anything a battle loads). |
| `apps/game/modpack/hangars/schema/recipe.schema.json` | JSON Schema, checked by `tools/build/tests/test_hangar_recipes.py` (paths in the allow-list, values typed, every referenced texture either ours or present in the 1.45 client — the test reads a checked-in list of client paths, `hangars/client_paths_1.45.txt`, regenerated by a tool from the packages). |
| `assets/otmetki/hangar_looks/<id>/lut.png` → `lut.dds` | our colour grading as a 256×16 strip; `tools/assets/lut.py` (Python 2.7, no deps) writes a 16³ RGBA8 volume DDS (header + raw bytes, the stock `lut_default.dds` layout: 16 512 bytes). Asset set `hangar_looks_luts`, origin `original`, target `res/system/maps/post_processing/cube/otmetki/`. `asset_sets.ASSET_EXTENSIONS` already includes `.dds`. |
| new data-only package `net.triotmetki.hangar_looks` (source folder `hangars/`, no `features/` entry: it has no code) | `tools/build/layout.py` learns a data package: the LUTs (and later CC0 skies) plus `res/mods/configs/otmetki/hangar_looks/recipes.json` (all recipes bundled), no Python. Built by `build.py` like the others, ~100 KB. A data package still needs its catalog entry and CHANGELOG entry (the layout test gets a `DATA_PACKAGES` exception for the Python files). |
| `catalog/catalog.json` | component `hangar_looks` (category hangar, context hangar, presets `[]`, perf `low`, fair-play note «Только освещение и вид вашего ангара, собирается на вашем ПК из файлов игры», `requires: ['hangar_space']`, `generator: 'hangar_looks'`); previews per look. setupkit learns `requires` and `generator`. |
| `features/hangar_space` | nothing new beyond 1a: generated looks appear by their `otm_` environment names. |

**Manager (`apps/game/manager/tauri/src/hangars/`, new module):**

| File | What |
| --- | --- |
| `packed_xml.rs` | thin wrapper over the `wg-toolkit` crate's packed-XML reader (MIT, §3.1) into a tree + a text-XML writer (the client reads text XML). Only if the crate does not fit (version, deps, Windows build): our own decoder (magic `0x62A14E45`, string table, element descriptors; ints, floats, bools, base64 blobs — the scratch decoder used for this spec is 60 lines), and the commit says why. Tests build packed bytes from a tree, so no Lesta file is a fixture. |
| `client_files.rs` | resolve a `res/` path the way `paths.xml` does (`res_mods/<version>`, `mods/<version>/*.mtmod`, packages in listed order, res/), read it from the zip; `zip` crate is already a dependency, `roxmltree` for `paths.xml`. |
| `recipe.rs` | load `recipes.json` from the installed `net.triotmetki.hangar_looks` package; validate; apply `set` ops to the cloned tree; refuse when a path is missing. |
| `generate.rs` | build `net.triotmetki.hangar_looks.gen_<client build>.mtmod` (stored zip, deterministic order): `res/spaces/<s>/environments/<GUID-from-id>/environment.xml` per look (+ copied `probes/`, `skyDome/` from the base environment when the recipe asks), and the space's `environments.xml` = Lesta's current list + our GUIDs (active environment unchanged). Writes `generated.json` next to the manifest: client build, recipe hashes, skipped looks with reasons. |
| `install` / `patch` hooks | run after install, update, migration and when `hangar_looks` is switched on; delete the generated file when it is switched off or the modpack is removed; the generated file is ours (`ownedPatterns` already match `net.triotmetki.*.mtmod`) and goes through the same `.part` → commit path. |
| UI (`web/`) | the component card shows «Собрано для клиента 1.45.0.0» or the skipped looks; a failure is a toast, never a blocked install. |

**Kill switch.** Each recipe carries `clients` (builds it was tested on); the manager generates only for those and
leaves the look out on an untested build until a catalogue update adds it. The catalogue gains `disabledLooks` (ids),
read on the manager's regular catalogue check: a listed look is removed from the generated package on the next check
without a modpack release. The mod side lists only looks whose environment exists, so a removed look disappears from
the gallery by itself and the choice falls back to «Как в игре».

**Compliance and fair play.** Hangar only; nothing runs in battle; no data of any player is read; no server request.
No Lesta file is shipped by us; copies stay on the player's PC. The looks stay in the free modpack (no Plus gate).
Recipes never touch battle maps, shared shaders or anything outside `spaces/<hangar>/environments/`.

**As built (2026-10-06), where the files above changed:**

- **Recipe keys:** `{id, clients, base {space, environment}, probes, sky {deferred, forward}, set [{path, value}]}`; the environment name is always `otm_<id>`, the folder GUID is derived from the id (sha256 of `otmetki/hangar_looks/<id>`), so neither is in the recipe. Pose, camera and hidden layers stay out: phase 1a's looks carry no pose, nothing would read them. `value` is a JSON number, bool, texture path or number array; the manager keeps the stock node's type. Repeated siblings are `name[i]` (0-based).
- **Sky:** the sky texture is not in `environment.xml` but in the sky dome's material (`skyDome/skybox.visual_processed`, property `diffuseMap`, `sky_box_HDR.fx` for deferred and `skyDome/forward/…` with `sky_box.fx` for forward): the manager copies the base's `skyDome/` and swaps that texture; the two `.model` files name their own folder (`nodelessVisual`) and are rewritten. The 4 looks use the Onslaught sky (night), `minsk_june_clear_sunset_rgbe` (sunset), `minsk_04_10_cloudy_day_rgbe` with `hangar_v3/cloud_2Fwrd` (steel) — shared or hangar packages, not map packages that rotate out.
- **Colour tables:** every RU 1.45 table in `system/maps/post_processing/cube/` is a plain 2D DDS of 256×16 (the 16³ cube unwrapped into 16 slices; `lut_default.dds`: BGRA8, no mipmaps, 16 512 bytes), not a volume texture. `tools/assets/lut.py` writes ours from `assets/otmetki/hangar_looks/src/grades.json` (our grading), no PNG strip.
- **Client index:** `hangars/client_<version>.json` (names only: texture paths under `maps/skyboxes/`, `maps/fx/`, `system/maps/`, and each base environment's parameter paths with their types) instead of `client_paths_1.45.txt`, so the test checks paths and types too; `tools/build/client_index.py` writes it, `tools/build/packed_xml.py` decodes.
- **Catalog:** `requires` is the existing `dependencies`; only `generator` and the top-level `disabledLooks` are new.
- **Manager:** the `wg-toolkit` crate is not used (its last release 0.4.1 is from 2024 and pulls rsa 0.8 — RUSTSEC-2023-0071 — blowfish, mio 0.8, glam and serde-pickle for a ~150-line codec); `hangars/packed_xml.rs` is ours, byte-identical round trip on every packed file of the h08 environments. The generated files are written as packed XML (what the client already reads from the stock files), not text XML. Details: [manager README «Hangar looks»](../../apps/game/manager/README.md).

### 5.6 Phase 2 — third-party hangars

- Only hangars from the "may ask" list (§4.2) whose author confirms the work is theirs and grants a written permission
  for the free and subscription editions (template §4.3), saved under `docs/ops/permissions/`.
- Catalogue: a `kind: "hangar"` entry modelled on `kind: "dependency"` (`packageId`, `version`, `file`, `author`,
  `licence` = the permission file with sha256, `sourceUrl` = the author's own download, `sha256`, `size`,
  `clients`), `optional: true`, never in a preset. The manager downloads it only when ticked, shows the size first, and
  removes only what it installed. Hosting on our VPS only if the author asks (no CDN: 150–600 MB per hangar per client
  version).
- `hangar_space` lists the new folder automatically; its title and preview come from the entry (new
  `hangar_space_name_*` or a catalogue-provided name).
- Upkeep is the author's: a hangar without an update for the new client build is not offered for that build.

### 5.7 Phase 3 — original space

Only with a 3D artist and a contract that assigns the rights to «Три отметки». Two routes:

- **3a — props in a stock space** (recommended first): original models and textures placed into a stock space by
  script (L8, scaled up: a few hero props, our «///» banner, lighting from our environment). No compiled space, no
  editor licence question, survives patches like phase 1b. Effort: 2–4 weeks of the artist, 3–5 days of ours. The
  props ship as our own `.model/.visual/.primitives` (asset set, origin `original`).
- **3b — a new space** like Hellinger's HMHM (proof that a small original space of 4–28 MB is possible): an artist who
  already works in WG's Unified Editor Modders Edition (§3.3) builds it from the `hangar_v4` source with only original
  content and compiles it with `batch_compiler`. Preconditions: the editor's Lesta build compiles for the current
  client; the editor's terms allow use for a free mod next to a paid product (unverified, WG's tool); recompilation by
  the artist after Lesta format changes is in the contract. Effort: 3–6 weeks of the artist, 2–3 days of ours
  (package, catalogue entry, `KNOWN_SPACES` name and preview).

### 5.8 Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Patch breakage (re-skin, new GUIDs, renamed environments, new packed-XML keys) | a look missing or wrong | recipes re-applied per build, `clients` gate, `disabledLooks`, mod lists only existing environments, missing → «Как в игре» |
| Server event hangars | our slot overwritten by an event | same owned-slot logic as the space slot: an event wins, ours returns after it |
| Private client API (`_defaultHangarSpaceConfig`, `_HANGAR_CFGS`, `EnvironmentSwitcher`) | silent no-op after a refactor | core guards every hook; missing attribute → the game's hangar; spike S1–S7 per patch in the dev loop |
| File size | generated package grows with copied probes (~17 MB per look) on the player's disk; our download ~100 KB | copy probes only for looks that need them (S4) |
| Weak PCs | heavier fog/god rays/SSAO cost FPS | recipes stay within the stock environment's cost; S8; a «Лёгкий» look (studio light, no god rays/lens flare) for `perf` «Только лёгкие» |
| Legal | Lesta objects to modified hangars or to hangars near a paid product | free only, no Lesta bytes shipped, ask in the Plus letter, removable by `disabledLooks` |
| Third-party claims | an author's hangar contains ripped assets | §4 provenance check, removal within 7 days clause |

## 6. Questions for the user

1. Phase 1a now (looks from stock environments, ~3 days)?
2. Phase 1b with the manager-side generator (~2 weeks incl. the spike), or the faster static-XML fallback in the free
   package (formally weaker, breaks on re-skins)?
3. May we write to Hellinger with the §4.3 message (asking for a build without the two WG files, §4.4)?
4. Add hangars to the Lesta letter about the Plus model?

## Sources

Client and repo (all read 2026-10-06):

- `refs/wot-src-ru/sources/res/scripts/client/gui/ClientHangarSpace.py` (`_readHangarSettings`, `create`,
  `_ClientHangarSpacePathOverride.setPath`), `gui/game_control/hangar_switch_controller.py`
  (`DefaultHangarSpaceConfig`, `_checkAddedEventNotifications`, `__updateEnvironmentForCurrentScene`),
  `gui/hangar_config.py`, `cgf_components/hangar_camera_manager.py` (`moveCamera`, `setDOFParams`),
  `gui/impl/lobby/customization/customization_main_view.py:130,216`, `common/constants.py`
  (`HANGAR_VISIBILITY_TAGS`), `res/gui/hangars.xml`, `_stubs/BigWorld.py` (`EnvironmentSwitcher`,
  `setSpaceItemsVisibilityMask`, `setColorGradingStrength`).
- `D:\Games\Tanki\paths.xml`, `version.xml`, `Licenses.txt`; `res/packages/h08_mt_hangar{,_bin,_hd}.pkg` and the other
  hangar packages (listed; `space.settings`, `environments/**/environment.xml`, `skybox.visual_processed`,
  `content/HangarPrefabs/h08_mt_hangar/*.prefab` decoded in the scratchpad).
- [apps/game/modpack/features/hangar_space](../../apps/game/modpack/features/hangar_space/),
  [apps/game/modpack/assets/README.md](../../apps/game/modpack/assets/README.md),
  [apps/game/manager/README.md](../../apps/game/manager/README.md) («Runtime dependencies», catalogue),
  [docs/research/data/2026-10-05-fair-play-audit.md](../research/data/2026-10-05-fair-play-audit.md) (article 15152,
  exception H), [2026-10-05-mod-community-hangar-settings.md](2026-10-05-mod-community-hangar-settings.md) §2 and its
  sources [8]–[12].

Legal (fetched 2026-10-06):

- Lesta EULA 4.1.2, 4.2.1, 4.2.2, 4.2.4, 4.2.5, 4.2.9, 6.2.3 — <https://legal.lesta.ru/eula/>
- Lesta game rules 1.19 — <https://legal.lesta.ru/game-rules/>
- Forbidden mods — <https://tanki.su/ru/content/guide/ban/nonusefulmods/>,
  <https://lesta.ru/support/ru/products/mt/article/15152/>
- МОСТ announcement (2025-10-30) — <https://tanki.su/ru/news/notifications/most-mt/>
- Content-creator guidelines — <https://legal.lesta.ru/contributors-content-guidelines/>
- WG EULA (v14) 5.2–5.6, 12.1 l — <https://legal.eu.wargaming.net/en/eula/>
- Monetisation by others: Левша ПЛЮС <https://lebwa.tv/hub/modpack-lebwa>; ПРОТанки boosty
  <https://boosty.to/yusha_protanki/posts/dc8cde88-dcdf-4125-ba92-f4fcb28a6cdb>; Jove boosty
  <https://boosty.to/jove/posts/5802ab8e-b804-4131-bc7f-4312c6738292>. No case of Lesta acting against paid mod
  features was found (not found ≠ does not exist). wgmods.net rules could not be read (script-only page).

Hangar mods:

- [H1] «Стальной охотник» — <https://wot-zone.ru/stalnoj-ohotnik-angar>
- [H2] «Минималистичные ангары» (Hellinger) — <https://wot-zone.ru/minimalistichnye-angary>
- [H3] «Маковое поле» (yarki33) — <https://wot-zone.ru/krasivyj-angar-makovoe-pole>
- [H4] HangMan (goofy67), wgmods 1170 — <https://wgmods.net/1170/>
- [H5] Hangar Manager port — <https://wot-zone.ru/mod-smeny-angara-hangar-manager>
- [H6] HangMan for 1.45 / 2.4.0.2 — <https://wotsite.net/angary-dlya-tankov/12171-mod-smeny-angarov-pri-nazhatii-knopki-pryamo-v-angare.html>
- [H7] Ангар Near You Team — <https://wotsite.net/angary-dlya-tankov/12552-angar-near-you-team-dlya-world-of-tanks.html>;
  modpack overview <https://cyber.sports.ru/wotblitz/blogs/3417104.html>; <https://nearyou.team/modpack>
- [H8] Jove's modpack — <https://joves-modpack.ru/>, <https://wot-zone.ru/modpak-dzhova>, <https://tankist.net/modpacks/jove>
- [H9] Hangar Premium V1 — <https://wgmods.net/5906/> (preview <https://wgmods.net/media/mod_files/shot_3229.jpg>)
- [H10] Hangar Premium V2 — <https://wgmods.net/3909/> (preview <https://wgmods.net/media/mod_files/hangar_premium_v2_fLKa313.png>)
- Battle maps as hangars — <https://wotspeak.org/hangars/235-zamena-angara-iz-igry-nabor-angarov-dlya-world-of-tanks.html>

Tools:

- [T1] wg-toolkit-rs — <https://github.com/theorzr/wg-toolkit-rs>
- [T2] WoT-Blender-Addons (SkepticalFox: XmlUnpacker/Packer, `compiled_space`) — <https://github.com/Simi4/WoT-Blender-Addons>
- [T3] BWXML — <https://github.com/hedger/BWXML>; WoTModTools <https://github.com/katzsmile/WoTModTools>; XML_Editor
  <https://github.com/mikeoverbay/XML_Editor>
- [T4] WoT-Blender-Toolkit — <https://github.com/wotcuk/WoT-Blender-Toolkit>
- [T5] Tank Exporter — <https://github.com/mikeoverbay/TankExporter>
- [T6] Tank-Exporter-PY — <https://github.com/mikeoverbay/Tank-Exporter-PY>
- [T7] io_scene_core — <https://github.com/Pyogenics/io_scene_core>
- [T8] BigWorld-Tools-for-Blender — <https://github.com/Ozzzmanov/BigWorld-Tools-for-Blender>
- [T9] Blender-SRT-Loader — <https://github.com/qirashi/Blender-SRT-Loader>
- [T10] PjOrion deobfuscator — <https://github.com/extremecoders-re/PjOrion-Deobfuscator>
- [T11] Unified Editor Modders Edition mirror — <https://github.com/Open-WG/WoT.UnifiedEditor> (base hangar source
  `res/spaces/hangar_v4`)
- [T12] koreanrandom topic 45741 (hangar editor for modders), read via web.archive.org — <https://koreanrandom.com/forum/topic/45741->
- [T13] wot-space.bin-utils (deactivated workspace) — <https://bitbucket.org/SkepticalFox/wot-space.bin-utils>
- [T14] WoT-Space-Parser — <https://github.com/Newmcpe/WoT-Space-Parser>
- [T15] nuTerra — <https://github.com/mikeoverbay/nuTerra>
- [T16] BigWorld OSE 14.4.1 fork — <https://github.com/v2v3v4/BigWorld-Engine-14.4.1>
- [T17] GrebTV hangar pack, koreanrandom topic 51445 (archived copy garbled) — <https://koreanrandom.com/forum/topic/51445->
- Agent skills: `npx skills find blender | 3d | bigworld | "world of tanks" | "game modding"` (skills.sh), 2026-10-06.

[H1]: https://wot-zone.ru/stalnoj-ohotnik-angar
[H2]: https://wot-zone.ru/minimalistichnye-angary
[H3]: https://wot-zone.ru/krasivyj-angar-makovoe-pole
[H4]: https://wgmods.net/1170/
[H5]: https://wot-zone.ru/mod-smeny-angara-hangar-manager
[H6]: https://wotsite.net/angary-dlya-tankov/12171-mod-smeny-angarov-pri-nazhatii-knopki-pryamo-v-angare.html
[H7]: https://wotsite.net/angary-dlya-tankov/12552-angar-near-you-team-dlya-world-of-tanks.html
[H8]: https://joves-modpack.ru/
[H9]: https://wgmods.net/5906/
[H10]: https://wgmods.net/3909/
[H-wotspeak]: https://wotspeak.org/hangars/235-zamena-angara-iz-igry-nabor-angarov-dlya-world-of-tanks.html
[H-switch]: https://wotsite.net/angary-dlya-tankov/12171-mod-smeny-angarov-pri-nazhatii-knopki-pryamo-v-angare.html
[T1]: https://github.com/theorzr/wg-toolkit-rs
[T2]: https://github.com/Simi4/WoT-Blender-Addons
[T3]: https://github.com/hedger/BWXML
[T4]: https://github.com/wotcuk/WoT-Blender-Toolkit
[T5]: https://github.com/mikeoverbay/TankExporter
[T6]: https://github.com/mikeoverbay/Tank-Exporter-PY
[T7]: https://github.com/Pyogenics/io_scene_core
[T8]: https://github.com/Ozzzmanov/BigWorld-Tools-for-Blender
[T9]: https://github.com/qirashi/Blender-SRT-Loader
[T10]: https://github.com/extremecoders-re/PjOrion-Deobfuscator
[T11]: https://github.com/Open-WG/WoT.UnifiedEditor
[T12]: https://koreanrandom.com/forum/topic/45741-
[T13]: https://bitbucket.org/SkepticalFox/wot-space.bin-utils
[T14]: https://github.com/Newmcpe/WoT-Space-Parser
[T15]: https://github.com/mikeoverbay/nuTerra
[T16]: https://github.com/v2v3v4/BigWorld-Engine-14.4.1
[T17]: https://koreanrandom.com/forum/topic/51445-
