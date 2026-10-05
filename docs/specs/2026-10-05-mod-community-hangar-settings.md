# Mod: «пользователи Три отметки» in battle, our own hangar, settings presentation — design spec

Date: 2026-10-05. Status: draft for the user's review. Nothing implemented. The open questions are collected in §5 and need answers before any work starts.

Related: [apps/game/modpack/CLAUDE.md](../../apps/game/modpack/CLAUDE.md), [docs/research/data/lesta-api.md](../research/data/lesta-api.md), [docs/research/data/2026-10-05-fair-play-audit.md](../research/data/2026-10-05-fair-play-audit.md), [docs/ops/most-publishing.md](../ops/most-publishing.md), [docs/research/competitors/2026-10-05-modpacks-deep-dive.md](../research/competitors/2026-10-05-modpacks-deep-dive.md), [docs/research/competitors/2026-09-29-modpacks-round3.md](../research/competitors/2026-09-29-modpacks-round3.md).

## 0. Summary

The user's reference is the Near_You Team modpack: its installer lists «Уникальный ангар Near_You Team (1 637 МБ)» and, under «Интеграция Near_You Team в битву блогеров», «Отображать игроков Near_You Team в ушах команды»; its settings live in the stock-styled ModsSettingsAPI window «Настройка модификаций» (framed groups, hotkey fields such as MOUSE4 / MOUSE5, OK / Отменить / Применить). Three requests follow from it:

| # | Request | Recommendation | Effort |
| - | ------- | -------------- | ------ |
| 1 | Mark the players who use our mod in the stock team lists («уши») | New feature `community_marks`: **opt-in** server flag «Показывать меня как пользователя Три отметки»; one signed request per battle with the arena's account ids; the server answers the subset that is opted in and has a live bound device; a row fill with our «///» logo (or without it, or a small badge: the player's choice, like Near_You's «Заливка с логотипом / без логотипа») on both sides, drawn by our HUD layer. Needs an explicit amendment of our own fair-play rule (§1.4) | 7–9 days |
| 2 | Our own hangar | **Now:** keep `hangar_space` (it already lists every hangar folder the client has, so third-party hangar packs, including the ones in МОСТ, appear in it automatically) and give it real previews. **Later, only if the user funds 3D art:** a branded hangar as a separate optional package, never part of the base download | 1–2 days now; 3–6 weeks of outside 3D work + 2–3 days of ours later |
| 3 | Settings «как у компонентов танка» | Keep our Gameface window (no ModsSettingsAPI dependency); add what the reference window has and ours lacks: a **key-capture hotkey field** (keyboard and mouse buttons), **framed groups** inside a card, a **colour field**. The second reading (a «комплектация» page laid out like the stock equipment slots) is an optional extra view. Which reading the user meant is question 1 in §5 | 3–5 days (fields), +4–6 days (slots page) |

## 1. Feature 1 — «пользователи Три отметки» in the team lists

### 1.1 Research

**Near_You.** Their «игроки в ушах» is not "has the mod installed". The Telegram announcement of 05.02.2025 (post 3214) lists the exclusive features of the Blogger Battle 2025 team: «Отображение тиммейтов — Near_You Team в ушах команды», «Уведомления в ангаре о ключевых событиях Битвы Блогеров», «Мод процента побед Near_You Team против команд: LeBwa, Jove и Yusha Team», «Серия Командных Боевых Задач» [1]. So the mark shows membership in their event team (players who joined their side of Lesta's Blogger Battle), which is a roster they hold, not a live "who runs our mod" signal. How the mod gets the roster is not published. Their mod is not on this machine: `D:\Games\Tanki\mods\1.45.0.0` holds only our packages, ModsList, GUIFlash and OpenWG Gameface; `%APPDATA%\Lesta\MirTankov\mods\gunmarks\nearyou_config.json` is the only trace (the protanki/Near_You «gunmarks» panel's position: `battle.offset`, `minimized`, `always_alternate`). The earlier deep dive notes their Python is protected and was studied only through AS3 and saved configs [2]. We did not decompile anything; Lesta's EULA 4.2.2 forbids it anyway [3].

**XVM** is the closest open precedent [4] (source in the deep-dive clone, `xvm/src`):

- `xvm_main/stats.py` `_load_stat()` builds one request per battle: every player as `accountDBID=vehCD=team`, sent with the own account id and token to XVM's stat server (`xvmapi.getStats`).
- The answer carries a per-player `status`; `Utils.as` `getXvmUserText()` turns bit `0x01` into `on` (XVM with network services on), `off`, or `none` (no XVM).
- The `{{xvm-user}}` macro draws `xvm-user-<on|off|none>.png` next to the name. The default Lesta configs put it in the battle loading screen, the Tab form, and (off by default) as `xvmUserMarker` in the players panel, **for both teams** (`formatLeftNick` and `formatRightNick`).
- So XVM sends every arena account id to its own server and marks users on both sides. XVM is a long-standing, Lesta-tolerated mod.

**Anonymised players.** The client gives other players an `accountDBID` of `0` when they use the game's anonymiser: Battle Observer's `components/replace_vehicle_info.py:27` relies on it to label them «Анонимно» [5]. An anonymised player therefore can never be looked up or marked, which is the behaviour we want.

**Rendering in the panels.** Two routes exist in open code:

- Scaleform injection: Battle Observer ships its own AS3 into the stock `PlayersPanel` (`battle/players_panels.py`, `meta/battle/players_panels_meta.py`: `as_addHealthBar`, `as_addDamage` per vehicle id, called back from Flash `onAddedToStorage`). GPL-3.0.
- Data decoration: overriding `VehicleArenaInfoVO` kwargs before the panel reads them (the same file shows the pattern for badges, clan tags and names). Changing the name there changes it everywhere the client shows it (markers, minimap, kill feed, chat), so it is too wide for a mark.

Our README («Left out of the component catalogue») already leaves out Scaleform icons in the panels for technical reasons and «оленемер» because it reads other players' data [6].

### 1.2 Rules this touches

| Rule | Source | Verdict |
| ---- | ------ | ------- |
| Lesta's ten forbidden categories (positions, aim, reload, spotting, direction to enemies, armour analysis…) | support article 15152 [7], fair-play audit | Not touched. The mark says which software a player chose to advertise; it says nothing about the battle state |
| Our rule: «Read only the player's own data… nothing from other players sent to our server» | modpack CLAUDE.md «Fair play», audit «Our own rule» | **Broken as written.** The request sends the arena's account ids. Needs the amendment in §1.4 |
| README: «оленемер» left out because it reads other players' data | modpack README | Different in kind (no stats, no ratings, only the opted-in flag), but the same principle; the amendment must say why this one is allowed |
| Lesta API terms: no passing personal data to third parties, no indefinite storage | lesta-api.md «Terms of use» | The ids come from the client, not from the API, and are not stored. The only thing we reveal is a fact the marked player consented to share, shown to players in the same battle |
| «Nothing is sent before the player binds the mod» | modpack CLAUDE.md | Kept: the request is signed by a bound device |
| EULA 6.2.5: no third parties' personal information without consent | [3] | Kept by opt-in |

**Enemies.** Showing that an enemy uses our mod is allowed under Lesta's list (no position, aim, reload or spotting data), XVM has done it on both sides for years, and the marked player consented to being shown to everyone in the battle. Recommended: both sides by default, with a viewer setting «Отмечать: всех / только союзников / никого». Question 3 in §5 asks the user to confirm.

### 1.3 Design

**Consent (opt-in, off by default).** One flag per Lesta account, «Показывать меня как пользователя Три отметки», settable in two places:

- site: `/me` → «Мод», a switch with the text «Игроки в одном бою с вами увидят значок «///» рядом с вашим ником. Анонимайзер игры скрывает и значок.»;
- mod: the `community_marks` card, a switch with the same text; it writes the server flag through a signed request (like `share_session_report`, whose server flag lives in `SessionSharePreference`).

Opt-out instead of opt-in would turn every bound device into a public "uses Три отметки" label without consent; rejected.

**Who is marked.** An account is marked when all of these hold:

- its flag is on;
- it has a bound device that is not revoked and was seen in the last 30 days (`mod_device.revoked_at IS NULL AND last_seen_at > now() - 30 days`), so a player who uninstalled the mod drops out on their own;
- its `player.is_hidden` is false (a deletion request hides it at once).

**Data flow.**

```
arena loaded (all vehicles known, not a replay)
  -> mod takes the arena's accountDBIDs, drops 0 (anonymised) and duplicates; <= 100 ids (Front Line has 60)
  -> POST /mod/presence (signed v2, like /mod/ingest), one request per battle
  -> server: one indexed query, answers the subset; stores and logs nothing from the body
  -> mod keeps the set in memory for this battle, draws marks; reinforcements joining later (Front Line) -> at most one more request
  -> no answer within 3 s, an error or 429 -> no marks, no retry, battle goes on
```

The requester does not have to be opted in to see marks. Whether seeing others should require being visible yourself is question 4 in §5.

**Contract** (`apps/game/modpack/contract/presence.schema.json`, draft-07, the same shape as `session-share.schema.json`):

- `presenceRequest`: `{device_id, account_id, account_ids: integer[1..100], uniqueItems}`; `account_id` must be the device's bound account (403 `account_mismatch` otherwise).
- `presenceAnswer`: `{account_ids: integer[]}`, always a subset of the request.
- `preference`: `{device_id, account_id, visible: boolean}` → `preferenceAnswer` `{account_id, visible}` (POST `/mod/me/presence`). The mod also reads the flag back from the same endpoint (`visible` omitted = read) to show the switch's real state.
- Errors as in the other contracts: 429 with `Retry-After`, `X-Otmetki-Server-Time` on every error.

**Server** (`apps/web/server`, module `mod`):

- Prisma (`schema/mod.prisma`): `ModPresencePreference { accountId BigInt @id, userId String, visible Boolean @default(false), updatedAt }`, relation to `User` with `onDelete: Cascade` and to `Player`. Keyed by the Lesta account because one user can link several accounts.
- `mod-presence.controller.ts`: `POST /mod/presence` and `POST /mod/me/presence`, the existing signature guard, `@Throttle` with `modDeviceTracker` (a new `MOD_PRESENCE` constant: 20 requests per minute per device; a battle needs one or two).
- Site: `GET/PUT /me/mod-presence` for the `/me` switch; the schema in `@otmetki/schemas`.
- Query (Kysely, `queries/presence.queries.ts`, pinned by a database test):

```sql
select distinct d.account_id
from mod_device d
join mod_presence_preference p on p.account_id = d.account_id and p.visible
join player pl on pl.account_id = d.account_id and not pl.is_hidden
where d.account_id = any($1)
  and d.revoked_at is null
  and d.last_seen_at > now() - interval '30 days'
```

  `mod_device(account_id)` is already indexed. No cache: one indexed query per battle per client is cheap; if load ever needs it, a Redis set of visible account ids rebuilt on every flag change is the next step.

- Retention: the request body is never persisted or logged; only a counter metric. The preference row goes with the user (cascade) and with a deletion request (the purge job deletes it). Account deletion in `/me` already removes devices, so the account drops out.

**Mod** (`features/community_marks/`, a normal feature folder):

- `model/`: pure logic: which ids to ask for (non-zero, unique, capped), merging a reinforcement request, which rows get a mark given the viewer setting, preview sample.
- `client/`: arena glue (the arena's vehicles via the core game helpers, replay check), the request through `core/client/me` `post_signed`, the marks through our HUD layer.
- `settings/`: config.json switch `community_marks` (on by default for viewing; viewing sends ids only once the mod is bound), `components.json` section with `style` (`fill_logo` / `fill` / `badge`), `sides` (`all` / `allies` / `none`), `color` (from the design tokens); the visibility flag itself is the server's, shown as a window action.
- Catalog entry and fair-play note: «Показывает значок «///» рядом с ником игроков, которые сами включили это на сайте или в моде. Отправляет на наш сервер только номера аккаунтов текущего боя, сервер их не хранит».

**The marker.** Near_You's installer (a later reference from the user) offers «Отображать игроков Near_You Team в бою (0,8 МБ)» with two radio options, «Заливка с логотипом (0,1 МБ)» and «Заливка без логотипа (0,1 МБ)»: their marker is a coloured fill of the player's whole row in the team lists, optionally with their logo, not a small badge. We offer the same choice as a player setting `style` in the `community_marks` section of `components.json`:

**Reference look** (the user's screenshot of Near_You players in the team lists): a purple/magenta horizontal gradient on the player's whole row, strongest at the row's outer end (behind the tank silhouette, toward the screen edge) and fading toward the nickname, with their «NEAR YOU» logo badge at the far outer end of the row. The nickname, the clan/medal icon and the tank silhouette stay readable on top. It is shown on **both teams**: enemy rows keep the stock red tint with the purple gradient over it, and the player's own gold row gets the fill too. Our version is the same idea in our colours: the `color-accent` token gradient with our «///» badge at the row's outer end (`fill_logo`), the gradient alone (`fill`), or the badge alone (`badge`); both teams by default, with the viewer setting «Отмечать: всех / только союзников / никого» (`sides`).

| `style` | What the row shows | Default |
| ------- | ------------------ | ------- |
| `fill_logo` | The accent gradient across the row, strongest at its outer end, plus our «///» badge (`LogoMark`) at that outer end | yes |
| `fill` | The same fill, no logo | |
| `badge` | Only a small «///», about 10 px, just past the nickname's end (after it on the left list, before it on the right one) | |

The window shows the three as a `ui_gallery()` with a picture each (drawn by the catalog preview tool from `model/preview.py`), so no new field type is needed.

**Colour and readability.** The fill uses `color-accent` from `@otmetki/design-tokens` (#ff7a1a; the HUD page already emits the tokens as CSS variables), never a hard-coded value; an optional `color` setting (swatches from the tokens, §3's colour field once it exists) lets a player change it. The stock rows already carry meaning in colour, and the fill must not take it away:

- **Team colours** (ally green, enemy red, the colour-blind enemy violet) live in the row's stock tint and in the name and vehicle text. As in the reference, the stock tint stays and our gradient lies over it: at most about 22 % opacity at the outer end, fading to 0 before the nickname, so an enemy row still reads red first and the name keeps its hue and contrast. The badge sits at the outer end, past the tank silhouette, never over the nickname or the clan/medal icon. Orange over red is closer in hue than Near_You's purple over red, so the spike checks it on enemy rows (and on the colour-blind palette) and may lower the opacity on enemy rows only.
- **Dead players:** the stock row greys out; the fill drops to about 40 % of its strength and the logo to half opacity, so a dead marked player still reads as dead first.
- **Own row:** the stock client highlights it in gold; as in the reference, a visible player's own row gets the fill too, at about half strength so the gold still reads as «this is me» (orange next to gold is the hardest pair; the spike screenshots it). The own row is marked only when the player's own flag is on, so it doubles as a check that others see them.
- **Platoon:** the platoon number icon stays visible; the fill never covers the icon column.
- **Selected / pointed row** (the stock highlight when the player points at a row in the cursor mode): the fill must not drown that highlight. If the fill cannot sit under it (see below), it lowers its opacity while the row is highlighted, which Python learns from the panel's own events.
- **Panel modes:** in `hidden` nothing is drawn; in `short` (frags and icon only) `fill_logo` falls back to `fill` because there is no room for the logo; `medium`, `long` and `full` show the chosen style over the row's real width in that mode.

**Where it is drawn.** Two ways to put a fill behind a stock row:

| Way | How | For | Against |
| --- | --- | --- | ------- |
| **Page component** (inside the stock `PlayersPanel`) | Our own AS3 added into the panel, like Battle Observer's `players_panels` (`as_addHealthBar` per vehicle id, the `onAddedToStorage` callback): a sprite under each row's text, so the fill really is behind it and follows rows, modes, sorting and the hover state for free | Pixel-exact, truly behind the text | Scaleform code and a Flash build in the modpack, which our README leaves out for technical reasons; one more thing to fix on every client patch |
| **Our HUD overlay** (Gameface page, aligned to rows) | Row rectangles placed from the panel geometry core already knows (`core/hud/panel/constants.py`: x 0 / W, 25 px rows from about y 45, up to 368 px wide in `full`) plus, from Python, each list's row order and the current panel mode; `core/hud/cover` already hides the layer under Tab, the loading screen and overlays | Fits our renderer chain, no Flash, HUD edit preview for free | The Gameface layer is drawn over the Scaleform page, so the fill tints the text instead of sitting behind it (hence the low opacity and the gradient away from the name); alignment can drift with modes, interface scale and late joins |

Recommended: the HUD overlay, with the readability rules above written for a layer that sits on top. The page component is the fallback if the spike shows the overlay cannot stay aligned or readable.

**Spike first (1 day)**, on RU 1.45 in the dev loop, answering in order: (1) can Python read each list's row order (the stock sorting of the arena data provider) and the panel mode, and get an event when either changes; (2) does an overlay fill at about 22 % keep ally, enemy (red tint), colour-blind, dead and own-row (gold) rows readable at interface scales 1.0 to 2.0 (screenshots go into this spec); (3) does the pointed-row highlight still show through. Outcomes: all three yes → the overlay; (1) yes but (2) or (3) no → phase 1 ships only `badge` on the overlay and the fills wait for a page component; (1) no → a page component spike (2 more days), or phase 1 ships the badge on the battle loading screen only. Decorating the name text stays a fallback for `badge` only, and only in the panel's own text (never `VehicleArenaInfoVO`, which would leak the mark into markers and chat).

Phase 2 (separate change): the Tab screen and the loading screen.

**Failure behaviour.** Never blocks anything: no network, a timeout, an unbound mod, a replay, a 429, a malformed answer → no marks and one log line. The battle HUD never waits for the answer.

**Tests.**

- Mod `model/` tests: id filtering (0, duplicates, cap at 100), reinforcement merge, side filter, preview.
- `tools/tests`: the fair-play payload test extended: the presence request carries nothing but account ids and the own device fields.
- Server: controller test (signature, account mismatch, throttle), database test of the query (revoked device, stale device, hidden player, flag off, other accounts' devices), contract test against `contract/examples/presence.example.json`.
- ui-web: the marker's layout per style and panel mode (`short` drops the logo, `hidden` draws nothing, own row at half strength, dead row dimmed) in Vitest; catalog previews of the three styles.

### 1.4 Rule amendment needed

The modpack CLAUDE.md «Fair play» line, the audit's «Our own rule», `.claude/rules/modpack/fair-play.md` and the README's «Left out» table would change from «nothing from other players sent to our server» to: «Other players' data is never read or sent, with one exception: `community_marks` sends the current battle's account ids (the ids the client already holds; anonymised players have none) to `/mod/presence` to learn which of them chose to be shown as our users; the server keeps nothing from that request». The МОСТ letter in most-publishing.md gets one item for it. This is a policy change for the user to approve (question 2).

## 2. Feature 2 — our own hangar

### 2.1 Research

- **How hangars ship.** A hangar is a space folder `res/spaces/<name>/` (`space.settings` with `hangarSettings`, chunks, models, textures). The client lists them in `gui.ClientHangarSpace` and addresses them as `spaces/<folder>`; our `hangar_space` reads exactly that list (`features/hangar_space/model/constants.py`). Mod hangars are `.mtmod` packages with a `res/spaces/...` tree inside, installed into `mods/<client version>/` (the «Минималистичный ангар» forum thread: open the `.mtmod` with 7-zip, the name is the folder under `spaces`) [8].
- **Size.** The stock hangar is about 408 MB on this machine (`res/packages/h08_mt_hangar.pkg` 254 MB + `_bin` 25 MB + `_hd` 130 MB). The Near_You hangar by Uotson/Valberton is 172.9 MB on a mirror (cyberpunk night city, clickable Blogger Battle 2025 commanders, custom music) [9]; their installer says 1 637 MB, probably unpacked with HD textures. Our whole modpack is 5.1 MB (`D:\Games\Tanki\mods\1.45.0.0\*.mtmod`).
- **МОСТ accepts hangars.** The curators' topic lists hangar updates: on 06.05.2026 MatroseFuchs posted updates of «Лесной ангар», «Минималистичный ангар», «Минималистичный ангар V2», «Премиум ангар 2-го поколения» [10]; the round-3 research saw «менеджер ангаров, минималистичный, премиум- и базовый ангары» updated for 1.45 [11]. So a hangar is not a fair-play problem; it falls under the usual criteria (rules, current version, regular support, the 7-day update rule).
- **Licences.** None of the free hangar packs we found publishes a licence (the «Минималистичный ангар» thread, the Near_You hangar mirror, the protanki.tv hangar section) [8][9][12]. Without a written licence we cannot ship anyone's hangar, and our assets rule needs a licence that allows a paid product (we sell Plus).
- **Lesta's assets.** EULA 4.2.5 forbids distributing the game's data [3]. A hangar built by copying stock models into our package redistributes Lesta's assets; a hangar that only references the client's own files by path does not, but it breaks whenever Lesta moves them.
- **Hangar mods are hangar-only**, so the fair-play audit verdict for `hangar_space` («allowed (H)») carries over.

### 2.2 Options

| Option | What | Size | Legal | Upkeep | Effort |
| ------ | ---- | ---- | ----- | ------ | ------ |
| **(a) Curated choice of existing hangars** (exists: `hangar_space`) | Lists the client's own spaces (base, White Tiger, museum, Armory Yard, Onslaught, Steel Hunter, birthday) and any third-party space folder the player installed, МОСТ ones included; writes the default-hangar override the way the client's own event notifications do | 0 | Clean | Per patch: `KNOWN_SPACES` and preview paths | done; +1–2 days for real previews (rendered once per patch with the dev loop, shipped as our art) and a «другие ангары из МОСТ» hint |
| **(b1) Branded hangar from original art** | A commissioned 3D scene in our style (neon «///», marks on the wall, our palette), all assets original | 150–400 MB | Clean if the contract assigns the rights to Три отметки | Each client patch can change the space format; a re-export or fix by the artist; МОСТ archives after 7 days without an update | 3–6 weeks of a 3D artist (money), 2–3 days of ours: package, catalog entry, `KNOWN_SPACES` + preview, manager "large optional download" |
| **(b2) Re-dressed stock hangar** | The stock base hangar's `space.settings` referencing the client's own models by path, plus our decals, lighting and a few small original props | 10–40 MB | Grey: no stock asset copied, but a modified Lesta scene; ask the МОСТ curators | Breaks when Lesta renames or moves the referenced files (every hangar update) | 1–2 weeks of a level artist, or a spike by us |
| **(b3) Licence an existing hangar** | Written licence from an author (e.g. Leonardo_Shpah, Valberton) for redistribution in a free mod that sits next to a paid product | 100–200 MB | Only with that licence | Ours or the author's, by contract | negotiation |

Any (b) ships as a separate optional package (`net.triotmetki.hangar_<name>`), off in every preset, downloaded by the manager only when ticked, and as its own МОСТ entry; `hangar_space` then lists it like any other space. It must never enlarge the base download.

### 2.3 Recommendation

(a) now, with real previews. (b1) only if the user wants to pay for art, and after a curators' answer that a modpack can carry its own hangar entry; (b2) as a cheaper prototype if the user wants to see a branded hangar first. Questions 5–6.

## 3. Feature 3 — settings presentation

### 3.1 What exists

- **Ours:** the Gameface window (`packages/ui` + `ui-web`): sidebar of groups, a card per component with its switch, fields rendered from the feature's own schema (`bool`, `int`, `choice`, `text`; `ChoiceGallery`, `ChoiceList`, `IntField`, `TextField` in `features/component/edit-setting`), «Дополнительно» folding, visual editors, profiles, instant apply with undo (`features/window/undo-change`). Opened from the ModsList 1.6.01 row or the «///» HUD button, Ctrl+Shift+T. Hotkeys are fixed choice lists: `battle_hotkeys` offers `ctrl_shift_j`, `ctrl_shift_k`, `ctrl_shift_n`, `ctrl_shift_m`, `none` — no key capture, no mouse buttons.
- **ModsSettingsAPI** (izeberg, cloned at `463416e`) [13]: a Scaleform window (`ModsSettingsWindow.as`, components from `ComponentsFactory.as`) that every mod fills through Python templates: `createCheckbox`, `createDropdown`, `createSlider`, `createStepSlider`, `createNumericStepper`, `createRadioButtonGroup`, `createInput`, `createColorChoice`, `createRangeSlider`, `createLabel`, `createEmpty`, `createButton` and `createHotkey` (`templates.py`); a mod registers with `setModTemplate(linkage, template, callback)` (`api.py:109`). Hotkeys are captured in Python (`hotkeys.py`: start accept → the next key or mouse button, default, clear; keysets checked with `checkKeyset`). Values are saved to `%APPDATA%\…\mods\modsettings.dat` (this machine has one). Changes are committed by OK / Применить and dropped by Отменить. It needs ModsList to open. **Licence: CC BY-NC-SA 4.0** (`__init__.py:6`), non-commercial.

### 3.2 The two readings

**Reading A — a stock-styled window like the screenshot.** The look the user saw: framed groups with a header (the mod's name and its on/off switch), plain rows (checkbox, dropdown, hotkey), OK / Отменить / Применить at the bottom.

- Using ModsSettingsAPI itself conflicts with our rule «Do not make the app depend on ModsSettingsAPI» (modpack CLAUDE.md), with its NC licence next to Plus, and with our schema-driven window (two UIs for one config). Not recommended.
- Getting the same experience in our window: (1) a `hotkey` field type with capture (the next key or mouse button, modifiers, «Сбросить» / «Очистить», conflict warning against the game's own bindings and our other hotkeys), stored as a key name list like MSA's keysets; the core `Hotkey` helper grows mouse buttons (MOUSE3–MOUSE7); (2) framed groups inside a card (a `GROUPS` list in a feature's settings: title + keys), the way MSA columns group rows; (3) a `color` field (swatches + hex) for the mark colours and the like. The instant-apply-with-undo model stays: OK / Отменить / Применить would double the state for no gain, and our undo already covers «Отменить».

```
┌ Быстрые клавиши в бою ─────────────────────────────── [вкл] ┐
│ ┌ Серверный прицел ──────────────────────────────────────┐ │
│ │ Горячая клавиша           [ MOUSE4      ] ⟲  ✕         │ │
│ │ Показывать уведомление    [x]                          │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌ Приближение x16/x25 ───────────────────────────────────┐ │
│ │ Горячая клавиша           [ MOUSE5      ] ⟲  ✕         │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
  clicking the key field: «Нажмите клавишу или кнопку мыши… (Esc — отмена)»
```

**Reading B — settings presented like the tank's modules and equipment.** The stock hangar shows equipment as a row of slots (icon tiles, an empty slot as an outline), and clicking a slot opens a picker of items with icons and effect lines. Applied to the modpack: a «Комплектация» page where each group (Бой, Ангар, Утилиты) is a row of slots, one per installed component; an enabled component is a lit tile with its icon, a disabled one an outline; clicking a tile opens its card (the same fields as today) in a side panel; the «Пресеты» become «комплекты» you swap like equipment presets.

```
Комплектация                                         Комплект: [ Основной ▾ ]
Бой      [///][◎][▤][♥][ ][ ][ ]      7 из 12 включено
Ангар    [⌂][⏱][ ][ ][★]              3 из 9
Утилиты  [⇩][ ][✉]                    2 из 6
───────────────────────────────────────────────────────────────
▣ Журнал боя            вкл  │ Позиция  [ слева снизу ▾ ]
  Урон, блок, засвет —       │ Строк    [ 6 ]
  в одном списке             │ ▸ Дополнительно
```

It reuses everything (the cards, the fields, `ui_thumb()` pictures, profiles) and is a view, not a new settings model; the risk is a stock-looking UI (our own art only: no stock slot sprites, as the assets rule requires) and one more page to keep in sync.

### 3.3 Recommendation

Reading A's three fields first (they close real gaps the reference window shows: mouse-button hotkeys for the server reticle and zoom are exactly what Near_You offers), keeping our window and the no-MSA rule. Reading B only if that is what the user meant (question 1).

## 4. Effort and risks

| Work | Effort |
| ---- | ------ |
| F1 spike: row order, panel mode, fill readability on RU 1.45 | 1 day (+2 if a page component is needed) |
| F1 server: model, two endpoints, `/me` endpoint, query + database test, contract | 2 days |
| F1 site: `/me` switch, i18n ru/en | 0.5 day |
| F1 mod: feature, HUD marker (three styles), settings, catalog, CHANGELOG, tests | 3–4 days |
| F1 rule amendment, МОСТ letter item | 0.5 day |
| F2a previews and hint | 1–2 days |
| F2b packaging of a commissioned hangar (art not included) | 2–3 days |
| F3 hotkey field (+ core mouse buttons), groups, colour field | 3–5 days |
| F3 «Комплектация» page | 4–6 days |

Risks:

1. **Policy.** F1 breaks our own «nothing from other players» rule; the amendment must be explicit, and the МОСТ curators may read sending arena ids differently from XVM's precedent. Mitigation: opt-in, ids only, nothing stored, the item in the МОСТ letter before release.
2. **Panel alignment and readability.** The HUD overlay may drift from the stock rows (panel modes, interface scale, late joins), and a fill drawn on top tints the stock text. Mitigation: the spike's three checks and the fallbacks in §1.3 (badge only, or a page component).
3. **Privacy perception.** A visible «uses Три отметки» label can attract harassment in chat. Mitigation: opt-in, off by default, the anonymiser hides it, one click to turn it off, takes effect next battle.
4. **Server load.** One request per battle per client; at 10 000 concurrent players about 3 requests per second. Fine; a Redis set is the next step.
5. **Hangar upkeep and size.** A custom hangar needs work on every client patch and grows the download by 150–400 MB; МОСТ archives entries not updated within 7 days. Keep it optional and separate.
6. **Licences.** No free hangar pack publishes a licence; ModsSettingsAPI is CC BY-NC-SA. Neither can be shipped without written permission.

## 5. Open questions for the user

1. «Настройки как у компонентов танка»: did you mean (A) a stock-styled window like the ModsSettingsAPI screenshot (framed groups, hotkey fields, OK / Отменить / Применить), or (B) settings laid out like the tank's equipment slots and modules? Or both?
2. Feature 1 needs a change of our own rule «nothing from other players is sent to our server» (§1.4): the mod would send the current battle's account ids (ids only, never stored) to learn who opted in. Do you approve this exception?
3. Mark players on both sides (like XVM) or only allies (like Near_You's team marks)? The proposal: both by default, a viewer setting for allies only.
4. Should seeing others' marks require being visible yourself (reciprocity), or can anyone with a bound mod see them?
5. Do you want to commission original 3D art for a branded hangar (3–6 weeks of an outside artist, 150–400 MB optional download, upkeep per patch), try the cheaper re-dressed stock hangar first, or stay with the hangar selector for now?
6. If a branded hangar: may we ask the МОСТ curators now whether a modpack can have its own hangar entry next to the main one?
7. The own row gets the fill (as Near_You does) when the player is visible, at half strength over the stock gold. Keep that, or skip the own row?
8. Default marker style: «Заливка с логотипом» (proposed, like Near_You's first option), «Заливка без логотипа», or the small badge?

## Sources

1. Near_You, Telegram, post 3214 (05.02.2025): the Blogger Battle 2025 team features. <https://t.me/s/neartv/3220>; overview of the modpack: <https://cyber.sports.ru/wotblitz/blogs/3417104.html>
2. [docs/research/competitors/2026-10-05-modpacks-deep-dive.md](../research/competitors/2026-10-05-modpacks-deep-dive.md) (Near_You: protected Python, studied through AS3 and configs; MSA usage across modpacks).
3. Lesta EULA, 4.2.2 (no reverse engineering or modification), 4.2.5 (no distribution of game data), 6.2.5 (no third parties' personal information without consent). <https://legal.lesta.ru/eula/>, fetched 2026-10-05.
4. XVM source (deep-dive clone): `src/xvm_main/stats.py` `_load_stat`, `src/xvm_main/xvmapi.py` `getStats`, `src/xvm_actionscript/.../com/xvm/Utils.as` `getXvmUserText`, `.../Macros.as:1171`, `release/configs/default_lesta/{playersPanel,battleLoading,texts}.xc`. <https://github.com/xvmteam/xvm>
5. Battle Observer (Armagomen, GPL-3.0): `components/replace_vehicle_info.py`, `battle/players_panels.py`, `meta/battle/players_panels_meta.py`. <https://github.com/Armagomen/battle_observer>
6. [apps/game/modpack/README.md](../../apps/game/modpack/README.md) «Left out of the component catalogue»; [2026-09-29-modpacks-round3.md](../research/competitors/2026-09-29-modpacks-round3.md) (оленемер and panel icons: our own ban).
7. Lesta support, «Запрещённые модификации клиента игры». <https://lesta.ru/support/ru/products/mt/article/15152/>
8. «[1.41.0.0] Минималистичный ангар с танком на подиуме», forum.tanki.su (Leonardo_Shpah; `.mtmod` with `res/spaces`; no licence stated). <https://forum.tanki.su/topic/2208423/>
9. «Ангар Near You Team для World of Tanks 1.45.0.0», wotsite.net (Uotson/Valberton, 172.9 MB, copy `mods` into the game folder; no licence stated). <https://wotsite.net/angary-dlya-tankov/12552-angar-near-you-team-dlya-world-of-tanks.html>
10. «[ALL] МОСТ», curators' topic, page 147 (MatroseFuchs, 06.05.2026: hangar updates). <https://forum.tanki.su/topic/2205036-all-%D0%BC%D0%BE%D1%81%D1%82/page/147/>
11. [docs/ops/most-publishing.md](../ops/most-publishing.md) and [2026-09-29-modpacks-round3.md](../research/competitors/2026-09-29-modpacks-round3.md) «Практический ориентир «разрешено»».
12. protanki.tv, hangar mods section. <https://protanki.tv/ru/mods?type=hangar>
13. izeberg/modssettingsapi at `463416e` (CC BY-NC-SA 4.0): `sources/scripts/client/gui/modsSettingsApi/{api,templates,hotkeys,view}.py`, `flash/src`. <https://github.com/izeberg/modssettingsapi>
