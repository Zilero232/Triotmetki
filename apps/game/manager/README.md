# Three Marks modpack manager

A Windows desktop app that installs and looks after the «Мир танков» modpack of [apps/game/modpack](../modpack/README.md). It replaced the Inno Setup installer (removed from the repo; installs it made are still picked up): same client detection, the same component catalogue (`components.json`), presets, profiles and state layout, plus what an installer cannot do — switching components on and off without reinstalling, and moving the modpack into the new `mods\<version>` folder by itself after a game patch.

Tauri 2: the Rust core in [`tauri/`](tauri), the React UI in [`web/`](web). Bun workspace `@otmetki/manager`.

```
apps/game/manager/
  package.json            scripts (below); the UI dependencies
  tauri/                  the Rust app (crate otmetki-manager)
    Cargo.toml tauri.conf.json build.rs rustfmt.toml
    capabilities/         what the window may call (core, open/save pickers, links, updater, restart)
    icons/                generated from apps/web/client/app/icon.svg (`bun run tauri icon`)
    windows/hooks.nsh     NSIS hook: the uninstaller offers to remove the modpack from the clients
    contract/             JSON the Rust tests write, the UI tests parse (the IPC contract)
    src/                  one module per concern, tests in <module>/tests.rs
  web/                    Vite + React UI
    index.html vite.config.ts vitest.config.ts vitest.setup.ts tsconfig.json global.d.ts
    src/                  FSD: app, views, widgets, features, entities, shared, ui-kit
```

## Commands

```bash
cd apps/game/manager
bun run dev               # tauri dev: Vite on :1420 + the Rust app (debug)
bun run build             # tauri build: web/dist + release exe + NSIS installer (needs the updater key, see Releases)
bun run build:ui          # the UI bundle only (web/dist)
bun run typecheck         # tsc -p web
bun run cargo:check       # cargo check --all-targets
bun run cargo:clippy      # clippy, warnings are errors
bun run cargo:test        # the Rust tests (tempdir fixtures, Cyrillic paths)
bunx vitest run --project manager                    # the UI tests (from the repo root; also part of `bun run test`)
OTMETKI_UPDATE_FIXTURES=1 bun run cargo:test         # rewrite tauri/contract/*.json after changing a command's output
```

Local builds need Rust stable (MSVC) and WebView2 (Windows 10/11 ship it). `tauri build` without `TAURI_SIGNING_PRIVATE_KEY` fails on the updater artifacts; for a local installer pass `--config '{"bundle":{"createUpdaterArtifacts":false}}'`.

## What it does

| Screen                     | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Главная                    | The update status (up to date / update available / moved / updated / waiting for a release / offline / failed) with its action, the conflict check when it found something (with «Восстановить набор»), the selected client (version, branch, mods folder) and the install summary; once after an update the «Модпак обновлён до X» card, and after the game ran the «компонент не загрузился» card (see «What's new» and «Post-launch health»). Not installed: the guided first run (game → preset → install: the preset straight to the wizard's review, or «Установка» to pick by hand). |
| Главная → Установка        | The first-run wizard, and «Изменить набор» later: client → components (presets «Рекомендуемый / Минимальный (FPS) / Стример / Свой», category tree with dependencies, preview pane with description, fair-play note and video, the required third-party libraries with their licence and author; an installer `.ini` profile can be loaded) → other mods → review.                                                                                                                                                                                                                          |
| Компоненты                 | The conflict check («Проверка папки модов»), then the catalogue by category with search, previews, a sound preview where the component ships a sound, the FPS cost badge and «Только лёгкие», fair-play notes and «Новое» on the components the installed release changed; a switch per component moves its `.mtmod` in or out of `mods\<version>` instantly. Switching on a component that was never installed downloads it from the current release (same version only).                                                                                                                  |
| Сборки и профили → Сборки  | Named component sets (up to 12): save the components that are on, apply one (opens «Установка» with that selection), rename, duplicate, delete, copy a `TS1.` code, save to a `.tmset` file; import a code or a file, and save or load all sets as one file (moving to another PC); «Синхронизация с сайтом» (below).                                                                                                                                                                                                                                                                       |
| Сборки и профили → Профили | The in-game settings profiles (`profiles.json`, shared with the Gameface window): save the current settings, apply, rename, delete, copy the `TM1.` code, import a code; «Синхронизация с сайтом».                                                                                                                                                                                                                                                                                                                                                                                          |
| Настройки → Общие          | Autostart with Windows (asked on the first run, pre-ticked), notifications, automatic update after a patch, check interval (15 min … 12 h), language, the game client (detected or a folder picked by hand), «Кеш игры» (find, tick, clear with a confirmation and the freed size), removing the modpack from the client (optionally deleting the mod settings together with the `%APPDATA%` copies).                                                                                                                                                                                       |
| Помощь → Вопросы           | FAQ (install, detection, presets, patches, conflicts, sets vs profiles, fair play, FPS, uninstall, SmartScreen), a link to the site, the logs zip and «Сообщить о проблеме» (below).                                                                                                                                                                                                                                                                                                                                                                                                        |
| Помощь → Что нового        | The modpack release history from the API (cached for offline use): notes per release and the components each one changed (see «What's new»).                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Настройки → О программе    | Version and self-update, the logs zip (to the desktop), where the data lives, the unsigned-build note.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

The sidebar has five sections in two groups: «Модпак» (Главная, Компоненты, Сборки и профили) and «Приложение» (Настройки, Помощь). «Установка» has no sidebar entry: it opens from Главная (first run, «Изменить набор», an update), from «Компоненты» and from a set's «Применить», and Главная stays highlighted while it is open. «Сборки и профили», «Настройки» and «Помощь» switch their pages with tabs at the top (`widgets/section-tabs`, the map is `PAGE_SECTIONS` in `shared/config`); the page ids and deep links are unchanged. The Главная dot marks a possible first install («Можно установить»), an update or a problem. The window is 1120×740 (at least 760×560). Errors are shown as a translated title and a hint (`errors.json`, `errorHelp.json`), never a raw OS error.

Closing the window hides it to the tray (menu: open, check for updates, quit). Autostart launches the app with `--background`: tray only, no window.

### Client detection (`tauri/src/detect`)

`%ProgramData%\Lesta\GameCenter\data\lgc_path.dat` → the Lesta Game Center folder → `preferences.xml` (every `working_dir`, the selected one under `selectedGames`) → each client folder: `version.xml` (`v.1.45.0.0 #…` and the realm), `paths.xml` (`Packages/Root` = the mods folder, the `res_mods` path, the package mask), `game_info.xml` (`.RPT.` = common test), `Tanki.exe`. Only Lesta clients 1.35+ are usable; WG and older clients are listed with the reason. A folder picked by hand is remembered in the settings.

### State (`tauri/src/state`, `install`) — the old installer's layout

`%LOCALAPPDATA%\TriOtmetki\clients\<key>\` with `key` = the first 16 hex characters of SHA-256 over the UTF-16LE of the ASCII-lowercased client path (exactly the removed Inno installer's `OtmClientKey`), so installs it made are picked up as they are:

| File                   | What                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client.ini`           | `[client] path, version, mods, res_mods` (UTF-16LE with BOM, like every state `.ini`)                                                                                                                                                                      |
| `manifest.ini`         | `[install] client, version, mods, installer, modpack, date, components` (Inno names `category\id`), `[files] count, 0..n` (absolute paths of our packages in the mods folder); the manager adds `[manager] version, disabled` and `[dependencies]` (below) |
| `notices\<id>\LICENSE` | the licence of each third-party dependency the manager installed into this client                                                                                                                                                                          |
| `disabled\`            | switched-off packages, moved out of `mods\<version>` (moved back when switched on)                                                                                                                                                                         |
| `backups\`             | snapshots written by the removed Inno installer and by earlier manager builds; the manager no longer reads or writes them and never deletes them (only uninstalling the modpack from that client removes the whole `clients\<key>\` folder)                |

Our files are the manifest's files plus anything matching `ownedPatterns` of the catalogue (`net.triotmetki.*.mtmod`, `otmetki.*.mtmod`, …). Other mods are never touched unless the player ticks them on the wizard's «Другие моды» step and confirms (that removal cannot be undone), and only paths from the listed set can be removed. If the modpack is installed but some of those paths or a runtime dependency could not be handled, the install still succeeds and reports `warnings` (`other_mods` / `dependencies` with an error code) shown as toasts. Install, update, migration, toggles and profile writes refuse while the game runs from that folder, and all of them (the background auto-update included) take one write lock: a second writer gets `busy` (the background check skips that tick). A package of ours whose component the current catalogue no longer lists (a retired component, in `mods` or `disabled\`) is dropped by an install or update (`patch::retired_files`); a catalogue without components drops nothing. An install or update writes and verifies every package as `<file>.part` first, then retires the old files as `<file>.otm-old` and renames the new ones in; any failure puts the old files back (a journal of what was retired and placed), and if even that fails (`rollback_failed`) the manager renames every `<file>.otm-old` whose original is missing back once more (`patch::recover_retired`). A migration stages the same way: every package is written and verified as `.part` first, existing copies in the new folder are retired, and a failure leaves the new folder as it was. A toggle undoes the moves it already made when one fails. Each package is hashed once after the download and once when its staged copy is read back.

### Runtime dependencies (`tauri/src/dependencies`)

Third-party mods our packages need at run time — OpenWG Gameface (MIT; the in-game window and the Gameface HUD) CH4MPi's GUIFlash 0.6.6 (MIT; the fallback HUD renderer) and, optionally, poliroid's ModsList 1.6.01 (MIT, © 2015-2025 Andrii Andruschyshyn; the mods button in the hangar that opens our window) — come as `kind: "dependency"` entries of `components.json` (see «Components catalogue»). The wizard lists the ones the selected components need (`requiredBy`), ticked automatically, with the licence and an author link; the player may untick one. An `optional: true` entry (ModsList) only adds a convenience: the wizard offers it the same way with an «Необязательно» badge, but switching a component on never installs it and its card does not list it. ModsList is published only on GitLab (`wot-public-mods/mods-list`) as a `.wotmod`; 1.6.01 is the last Scaleform build the Lesta client runs, and the manager saves the pinned bytes under the catalogue's `file` (`.mtmod`). The install then, per dependency:

- **finds a copy first**: any `<packageId>_*.mtmod|wotmod` (or `<packageId>.mtmod|wotmod`) up to 4 levels deep in `mods\<version>`. A copy the manager did not record as its own is the player's: it is used as is, recorded as `user`, never replaced, never removed. A file we installed whose sha256 no longer matches (the player put their own build over it) counts as theirs too;
- **otherwise downloads the pinned release** from `sourceUrl` (size capped by `size`), checks `sha256`, downloads the licence from `licence.url` and checks `licence.sha256`, all before any file in the client changes; then writes it through `.part` like our packages (an older version we own is retired), saves the licence to `clients\<key>\notices\<id>\LICENSE` and records it as ours.

`manifest.ini` keeps one line per dependency under `[dependencies]`: `<id>=ours|<file>|<sha256>` (installed by the manager — «ours: dependency») or `<id>=user|<file>|` (the player's). Only `ours` entries whose file still has the recorded sha256 are ever touched: a migration or an update after a patch copies them into the new `mods\<version>`, and uninstalling removes them with their notices; an update (the automatic one after a patch, or «Обновить модпак») also replaces an `ours` dependency whose pinned file in the refreshed catalogue differs (`dependencies::updates`): the new release file and its licence are downloaded and checked with our packages, before any file changes, and installed after them (the older copy is retired; a failure at that step is logged and leaves the carried copy); `user` entries and unrecorded copies stay. Ours are left out of the wizard's «Другие моды» list. Switching a component on in «Компоненты» runs the wizard's pipeline for the dependencies it and the components it pulls in need (`dependencies::needed_to_enable`, no exclusions, optional ones left out): under the write lock, with the game closed, every missing one is downloaded and checked before any file changes (a failure leaves the component off), then the component is enabled and the dependencies are installed or, for the player's copies, recorded as `user`. Its card lists them («Сторонние библиотеки»). Switching one off removes nothing. OpenWG Gameface registers our pages through `res_map` on the first start, which would restart the client once; the manager writes that file itself after every change (see «OpenWG Gameface res_map»), and only when it could not does a toast after the install or update say the game will restart once.

Dependency downloads use their own allowlist, compiled into the manager (`releases/sources.rs`), not the catalogue: https only, no port or credentials, exact host plus path prefix — `github.com/CH4MPi/GUIFlash/releases/download/`, `raw.githubusercontent.com/CH4MPi/GUIFlash/`, `gitlab.com/-/project/68695173/uploads/` (OpenWG Gameface's release files; its official releases are on GitLab, not GitHub), `gitlab.com/openwg/wot.gameface/-/raw/`, `gitlab.com/-/project/26509092/uploads/` (ModsList's release files) and `gitlab.com/wot-public-mods/mods-list/-/raw/`; redirects may also go to GitHub's release-asset storage (`release-assets.githubusercontent.com/github-production-release-asset/`, `objects.githubusercontent.com/github-production-release-asset-2e65be/`). Anything else is `untrusted_host`. A new dependency host means a new rule there.

Uninstalling the app (Windows «Приложения») runs `otmetki-manager.exe --uninstall-mods` from the NSIS hook when the player agrees: in every recorded client it removes our files (manifest + masks, plus the dependencies recorded as ours) and the state folder, keeps other mods (the player's own copies of the dependencies included) and the mod settings. Silent uninstalls (updates) keep the modpack.

### OpenWG Gameface res_map (`tauri/src/gameface`)

On Lesta, OpenWG Gameface 1.2.2 (`openwg_gameface.py`, `ResMapManager`) merges every mod's `mods/configs/res_map/*.json` into the game's `gui/unbound/gen/res_map.json` at each start and writes the result to `<first existing paths.xml Path>/gui/unbound/gen/res_map.json` (`res_mods\<version>`). When the text differs from the file on disk it writes it, creates `res_map_restart` in the game folder and calls `BigWorld.restartGame()`; the restarted client sees the same text, validates it and deletes the flag (the flag also stops a second restart in a row). When no config is left it deletes the file and restarts. So every install or update that changes our `net.triotmetki.ui` registration used to cost one client restart.

After an install, update, migration, toggle, «restore missing» and uninstall the manager computes the same file and writes it (atomically) or deletes it, so Gameface finds nothing to change (`gameface::sync`, called through `Manager::sync_res_map`):

- inputs, in Gameface's order: the first `res/packages/gui-part*.pkg` that has `gui/unbound/gen/res_map.json` (`,}` replaced by `}`), then the loose configs of `<game>\mods\configs\res_map\*.json` (folder order), then the one config from the game's file system (`res_mods\<version>`, `res`, or a mounted `*.mtmod` under `res/mods/configs/res_map/`) whose name the loose ones do not already use;
- each config item without `itemID` or with an `itemID` seen before is skipped; the others get the next free number (`hex(len(map))`), `itemID` removed;
- the output is `json.dumps` of the map sorted by the hex key, `separators=(',', ':')`, `ensure_ascii=False`, compared byte for byte.

Python 2 writes each object's keys in its dict order, which depends on the client's string hash; that hash is not CPython's (the classic one was checked and does not match), so the manager does not simulate it. Instead `gameface/key_orders.json` lists, per object shape (the keys in insertion order, plus `itemID` removed for config items), the order Gameface wrote, taken from a real 1.45 client; when a `res_map.json` Gameface wrote is on disk, every item whose content matches adds or checks its shapes too. Numbers are kept as written (a float stops the merge), strings are re-escaped like Python's encoder.

It gives up (`ResMapOutcome::Skipped`, logged, nothing written) when the Gameface package is not exactly a known version (`SUPPORTED_VERSIONS`), there are two copies, the client is not a Lesta release client, `paths.xml` names no folder, a package cannot be read, more than one packaged config exists (their order in the game's file system is unknown), a shape has no known order, the file on disk contradicts a known order, or anything is non-ASCII. Then Gameface restarts the client once, as before, and the UI (`get_gameface_status`, `entities/gameface`) shows «При первом запуске игра один раз перезапустится — так OpenWG Gameface применяет новые ресурсы» after the install or update. Without Gameface in `mods\<version>` the file is left alone. The flag file is never touched.

`gameface/tests.rs` checks the merge byte for byte against `fixtures/expected_res_map.golden`, cut from the file Gameface 1.2.2 wrote on a 1.45 client, plus the file-system rules on a temporary client; `OTMETKI_GAMEFACE_CLIENT=<game folder> cargo test -- --ignored reproduces_the_res_map_gameface_wrote` compares the full merge with the file Gameface wrote on a real client (14.5 MB, equal on 1.45.0.0). A new Gameface version, or a client patch that brings new object shapes, needs `key_orders.json` and `SUPPORTED_VERSIONS` refreshed from such a client.

### Profiles and durable settings (`tauri/src/profiles`, `durable`)

`mods\configs\otmetki\profiles.json` is the in-game UI's file (`{version: 1, active, profiles: [{id, name, created, updated, data: {config, components}}]}`, at most 12, names up to 40 characters, `server_url`, `bind_code`, `settings_action` and the privacy and network switches — `send_*`, `upload_replays`, `publish_replays`, `share_settings`, `settings_target`, `settings_anonymous_stats`, `settings_include_*` — are never stored or applied, the same list as the mod's `ui/profiles`). Applying a profile merges `data.config` into `config.json` (a value whose JSON type differs from the current one is skipped) and each section of `data.components` into `components.json`. An imported code is added inactive; it takes effect only when the player applies it. Codes are `TM1.` + base64url(zlib(JSON)), compatible with the mod.

Every write follows the mod's durable-settings contract ([modpack README «Durable settings»](../modpack/README.md#durable-settings-appdatatriotmetki)): the whole file is written atomically to `mods\configs\otmetki\<name>` and to `%APPDATA%\TriOtmetki\<name>`, with the same unix time in each folder's `saved_at.json`. Reads take the newer copy, restore a missing or older game-folder copy and refresh a missing or older `%APPDATA%` copy; the file mtime is set to the stamp. «Удалить настройки мода и привязку к сайту» deletes the game-folder settings and, unless another client still has the modpack, the `%APPDATA%` copies (`credentials.json` included) and their `saved_at.json` entries.

### Conflicts (`tauri/src/conflicts`)

«Проверка папки модов» (`get_conflicts`, on Главная when it finds something, always on «Компоненты») scans the selected client and reports, without changing anything:

| Finding      | How                                                                                                                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `missing`    | components the manifest records that are neither in `mods\<version>` nor parked: a cleaner or МОСТ (which empties the folder on every install) removed them                                                                                                                          |
| `replaced`   | an enabled package of the catalogue's version whose sha256 differs from the catalogue's (only when the catalogue has hashes, i.e. a release catalogue): another build was put over ours                                                                                              |
| `duplicates` | two or more packages with the same id anywhere up to 4 levels deep in `mods\<version>` (the id from `meta.xml`, else the file name without `_<version>`): two versions of one of our components, or two copies of GUIFlash / OpenWG Gameface / any mod                               |
| `foreign`    | a third-party package matching a catalogue `conflicts` rule (file name or `meta.xml` id: XVM, PMOD, Battle Observer, marks calculators, lamps, damage logs, session stats, replay managers) while one of the components the rule lists is on; runtime dependencies are never flagged |
| `overrides`  | a third-party package with entries under the catalogue's `ownedPaths` (it overwrites our files), and files under `res_mods\<version>` in those paths (res_mods wins over packages); five sample paths and the count                                                                  |

Packages are read as zip archives: the central directory and `meta.xml` only (at most 64 KiB), never a file's content. «Восстановить набор» (`restore_missing`, confirmed) takes the write lock, refuses while the game runs, and downloads each missing or replaced package again from the installed release (same version only; otherwise `release_unavailable` and the card points to «Обновить модпак»), staged and verified like an update. It replaces only our packages and does not touch configs. Nothing missing or replaced: `nothing_to_restore`.

### Component sets (`tauri/src/sets`)

`%APPDATA%\TriOtmetki\manager\sets.json` (the manager's own file, next to its settings; a set is a list of our component ids, so it is not per client):

```json
{
  "version": 1,
  "sets": [
    { "id": "a1b2c3d4e5f6", "name": "Стрим", "components": ["core", "companion", "marks_panel"], "created": 1790000000.5, "updated": 1790000100.25 }
  ],
  "deleted": [{ "id": "0f1e2d3c4b5a", "deleted": 1790000200.0 }],
  "syncedAt": null,
  "revision": null
}
```

At most 12 sets, names up to 40 characters, ids of 12 hex characters, component ids `^[a-z][a-z0-9_]*$` (unknown ones are kept: a newer catalogue may have them), at most 200 per set. A deletion leaves a tombstone (the last 100). Codes are `TS1.` + base64url(zlib(`{name, components}`)); a `.tmset` file is `{format: "triotmetki-component-set", version: 1, name, components}`; «Все сборки в файл» writes the whole `sets.json`, and importing such a file merges it (below) after the same checks as our own file (names, ids up to 64 characters, component ids, the limits). An export always ends in `.tmset` / `.json` (added when the chosen name lacks it); an import reads at most 64 KiB. A `sets.json` that no longer parses is kept as `sets.json.damaged` on the next change instead of being overwritten. Applying a set opens the wizard with it (`closeDependencies`), so installing, downloads and dependencies stay the wizard's.

### Sync through the site (`tauri/src/sync`, `credentials`, `site`, `service/sync.rs`)

«Синхронизация с сайтом» (a card on «Сборки» and «Профили») keeps the sets and the selected client's profiles on triotmetki.ru, stored per site user, so a new PC or a reinstall gets them back. Nothing syncs by itself: the player presses «Синхронизировать».

- **Binding.** The manager reuses the mod's binding: `credentials.json` (`{accounts: {"<account_id>": {device_id, secret, account_id, bound_at}}}`, read through the durable pair `mods\configs\otmetki` + `%APPDATA%\TriOtmetki`, newest first). Without one the card asks for a bind code from the site (the same code the mod takes, issued on `/me`): `POST /mod/bind {code, mod_version: "manager <version>", client_version, realm: "RU"}` (no `account_id`: the server takes the account from the code, else the user's primary one) returns the device secret, which is saved into `credentials.json` like the mod does, so the mod is bound too. The manager never asks for Lesta credentials. With several bound accounts a select picks the one to sync (`%APPDATA%\TriOtmetki\manager\state.json` `syncAccountId`); the UI only ever sees account ids and device ids, never the secret.
- **Requests** are signed exactly like the mod's (`site/signing.rs`: HMAC-SHA256 v2 over `v2\nMETHOD\npath\ntimestamp\nnonce\n` + body, headers `X-Otmetki-Device/-Timestamp/-Nonce/-Signature`); a 428 re-syncs the clock from `X-Otmetki-Server-Time` and retries once. No redirects are followed. 401/403 → `link_revoked` (bind again), 404 → `sync_unavailable` (the server has no sync: stay local), 429 → `rate_limited`, no network → `site_offline`.
- **Endpoints** (`apps/web/server` `mod-sync`): `POST /mod/me/sets|profiles {device_id, account_id}` answers `{sets|profiles, deleted, revision, updated_at}`; `PUT` the same path with `{…, sets|profiles, deleted, mode: "merge" | "replace"}` stores and answers the stored state. The server applies the same merge and limits (12 items, 40-character names, 200 component ids, 100 tombstones, 32 KiB of profile data) and strips the privacy keys from profile configs.
- **Deciding** (`sync::decide`, tested): the local side changed when an item or tombstone is newer than `syncedAt` (everything counts before the first sync); the site changed when its `revision` differs from the one stored at the last sync and its content differs from the local copy (`remote_changes`). Only local → `PUT merge` (pushed); only the site → take its copy (pulled); neither → up to date; both → **conflict**: nothing is written and a dialog shows «Сборки: здесь изменено N, на сайте M» with «Объединить» (`PUT merge`: last writer wins per id by `updated`, tombstones win over older copies), «Оставить мои» (`PUT replace`) and «Взять с сайта». A server whose revision went back (its copy was deleted) counts every local item as a change.
- **Sets** store the answer with `syncedAt` and `revision` in `sets.json`. **Profiles** have no tombstones in `profiles.json` (the mod's file), so `clients\<key>\profile-sync.json` keeps `{syncedAt, revision, known, deleted}`: a profile id synced before and now missing becomes a tombstone. Profiles are synced without the privacy keys (the `EXCLUDED_CONFIG_*` list); writing pulled profiles refuses while the game runs (`client_running`), keeps each local profile's extra fields and the active profile when it still exists.
- **Offline-safe**: the manager holds the write lock for the whole sync, writes nothing until the server answered, and a failure leaves every local file as it was.

### Game cache (`tauri/src/cache`)

«Кеш игры» in «Настройки» (`scan_cache`, `clear_cache`) lists only folders the client itself creates as caches next to `preferences.xml` (RU 1.45 source: `BigWorld.getPreferencesFilePath()` + the cache folder; checked on a live `%APPDATA%\Lesta\MirTankov` on 2026-09-29) in every `%APPDATA%\Lesta\MirTankov*` folder that has a `preferences.xml`: `web_cache`, `dossier_cache`, `custom_data`, `account_caches`, `collections_cache`, `lobby_cdn_cache`, `offers_cache`, `external_cache`, `clan_cache`, `game_loading_cache_mt`, and `profile\cef_cache\Cache`, `Code Cache`, `GPUCache` (the in-game browser's cache, not its cookies or local storage); and in the game folder `win64\Reports` (crash reports) and `win64\logs` (the error monitor's logs). Never listed: `preferences.xml`, `battle_results`, `storage_cache` and `veh_cmp_cache` (player choices), `tutorial_cache`, `messenger_cache`, `mods`, `replays`, `res_mods`, `updates` (the Game Center's download folder), other mods' folders (`xvm`, …). Each folder is emptied, not removed; a folder reached through a symbolic link or junction anywhere on its path (the `Lesta` folder, a profile, `profile\cef_cache`, `win64`) is never listed, and links inside a folder are skipped. The clear takes the write lock and refuses while any detected client runs (the `%APPDATA%` caches are shared); the answer is the freed size and the folders that could not be cleared.

### Components catalogue

`components.json` from `tools/build/setupkit` over [apps/game/modpack/catalog](../modpack/catalog/README.md) (schema in its [README](../modpack/catalog/README.md#componentsjson)). Entries with `kind: "dependency"` are third-party runtime dependencies, not our packages; the manager reads them into `dependencies` (the UI gets them there too) and drops one that claims our names, has no 64-hex `sha256` / `licence.sha256` or a file name that is not `<packageId>_….mtmod|wotmod`. Their fields: `id`, `kind`, `packageId`, `version`, `file`, `title`, `description`, `author {name, url}`, `licence {name, url, sha256}`, `sourceUrl`, `sha256`, `size`, `requiredBy` (our component ids), `optional` (default `false`: never installed by switching a component on), `restartRequired`. Our components also carry `perf` (`low`, `medium`, `high`: the FPS cost badge and «Только лёгкие») and `preview.audio` (a sound played with `<audio>` from the previews folder, `media-src` of the CSP); the top level carries `ownedPaths` and `conflicts` for the conflict check (a rule whose masks name our own packages is dropped). The entries live in the modpack's [catalog.json](../modpack/catalog/catalog.json) (background: [docs/specs/2026-09-28-manager-runtime-dependencies.md](../../../docs/specs/2026-09-28-manager-runtime-dependencies.md)). The installer ships no catalogue and no packages: the manager reads only `%LOCALAPPDATA%\TriOtmetki\manager\components.json`, downloaded with a release and checked by sha256; its images and sounds (`preview.image`, `preview.audio`) are fetched in the background into `previews\` next to it from the same release folder (only the missing ones, or all when the catalogue changed), served through the asset protocol, and a missing one shows the category placeholder. On the first install the wizard asks the API for the release of the selected client, downloads its catalogue and then its packages from the VPS, the same path as an update. Without a connection the plan's `source` is `offline`: the wizard shows «Нет соединения — установка модпака недоступна, попробуйте позже» and keeps «Установить» disabled, and `install_modpack` answers `offline` (`service/tests.rs`, the `install-blocker` tests). `unavailable` means the server answered but no release supports that client yet.

### Patches and updates (`tauri/src/patch`, `service/check.rs`, `background`)

On start, every minute cheaply (has `version.xml` moved past the manifest's version?) and fully every check interval, the manager asks the API for the release that supports the client:

`GET https://api.triotmetki.ru/modpack/releases/latest?game=<client version>` (override with `OTMETKI_API_URL`)

```json
{
  "game": "1.46.0.0",
  "status": "compatible",
  "release": {
    "version": "0.2.0",
    "publishedAt": "2026-09-27T12:00:00.000Z",
    "games": ["1.46.*"],
    "notes": { "ru": "…", "en": "…" },
    "catalog": { "url": "https://…/components.json", "sha256": "…" },
    "packages": [{ "id": "core", "file": "net.triotmetki.core_0.2.0.mtmod", "url": "https://…", "sha256": "…", "size": 389723 }],
    "signature": "<contents of the .sig>"
  }
}
```

`status: "waiting"` with `release: null` when no release lists the version. The plan (`patch::plan`, tested):

| Client patched? | Server says                       | Action                                                                                                                                |
| --------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| yes             | compatible, same modpack version  | **migrate**: copy our packages from the old `mods\<version>` into the new one, rewrite the manifest (configs are version-independent) |
| yes             | compatible, newer modpack version | **install**: download every enabled and parked package, verify sha256, replace older versions, drop retired components                |
| yes             | waiting                           | notify «Ждём обновления модпака под X», check again on schedule                                                                       |
| yes             | unreachable                       | offline, check again                                                                                                                  |
| no              | compatible, newer                 | «Доступна версия» + «Обновить модпак» (game must be closed)                                                                           |

With «Обновлять модпак после патча автоматически» off, a patch reports `migration_ready` («Перенести в новую папку») or `update_ready` («Обновить модпак» installs the compatible release). When the game is running the automatic action is `deferred` and runs as soon as the game exits. Every detected client with a manifest is checked, not only the selected one; unsupported clients (`problem` set) are reported as `unsupported` and every mutating command refuses them with `client_unsupported`. A failure is reported as `failed { code }` and shown translated, never as a raw OS error or path.

Every release must carry `signature`: a minisign signature (the same key as the self-update, `tauri.conf.json` `plugins.updater.pubkey`, compiled in as `RELEASE_PUBLIC_KEY`) over this text, LF line ends, packages sorted by id:

```text
otmetki-modpack-release/1
version 0.2.0
games 1.46.*
catalog <catalog sha256, lowercase, or ->
package core net.triotmetki.core_0.2.0.mtmod 389723 <sha256, lowercase>
```

`release.yml` writes this payload (`apps/web/server/scripts/modpack-release.ts prepare`, `releasePayload` in the server's `modpack-releases/lib/release-build`, tested against the same layout) and signs it with `TAURI_SIGNING_PRIVATE_KEY`; by hand it is `bunx tauri signer sign -f %USERPROFILE%\.tauri\otmetki-manager.key release.txt`, and the `.sig` contents (base64) go into the release's `signature`. An unsigned or mis-signed release is refused (`signature_invalid`); a debug build accepts an unsigned one only with `OTMETKI_ALLOW_UNSIGNED` set. Downloads are https from `triotmetki.ru` or its subdomains only (redirects included, `untrusted_host` otherwise), capped by the listed `size`; a package whose sha256 differs is refused before any file in the client changes. Notifications (Windows toasts) announce migrated / updated / ready / deferred / waiting / available / failed, once per change and per client.

The server side is `apps/web/server/src/modules/modpack-releases`: it reads the release index from `downloads/releases.json` under its working directory (`MODPACK_RELEASES_SOURCE.indexPath`; in production the VPS folder `DEPLOY_PATH/downloads`, mounted read-only by docker-compose.yml, the same folder Caddy serves at `https://triotmetki.ru/downloads/`). It is cached for a minute; a stale copy is served at once while one shared re-read runs in the background, and a failed re-read is retried after a minute, so the last good copy survives. A missing or empty file is an empty index (every client gets `waiting`, the updater 204). The index is validated by `modpackReleaseIndexSchema` from `@otmetki/schemas`:

```json
{
  "schemaVersion": 1,
  "releases": [
    {
      "version": "0.2.0",
      "publishedAt": "…",
      "games": ["1.46.*"],
      "notes": null,
      "catalog": null,
      "packages": ["…"],
      "signature": "<contents of the .sig>"
    }
  ],
  "manager": {
    "version": "0.2.0",
    "publishedAt": "…",
    "notes": "…",
    "platforms": { "windows-x86_64": { "url": "https://…/otmetki-manager_0.2.0_x64-setup.exe", "signature": "<contents of the .sig>" } }
  }
}
```

`games` patterns: `1.46.*` (any build of 1.46), `1.46.0.0`, or `1.46` (= 1.46.0.0). The newest matching release wins (semver).

### Self-update

`tauri-plugin-updater` asks `GET https://api.triotmetki.ru/modpack/manager/update?target=windows&arch=x86_64&current=<version>` (the same module): 204 when current, otherwise Tauri's dynamic-update JSON `{version, notes, pub_date, url, signature}` from the index's `manager` block. «О программе» checks and installs it (NSIS, passive), then restarts. The update archive is verified against the minisign public key in `tauri.conf.json` (`plugins.updater.pubkey`); the private key is `%USERPROFILE%\.tauri\otmetki-manager.key` on the owner's machine and must be stored as the `TAURI_SIGNING_PRIVATE_KEY` repository secret (empty password).

**Unsigned code.** The exe and the installer are not Authenticode-signed (DigiCert and Sectigo do not issue certificates to Russian entities, Azure Artifact Signing is unavailable in Russia, and SignPath's free tier is for fully open-source projects). SmartScreen shows «Windows защитила ваш компьютер» on the first run of each new file. The minisign signature protects the update channel only; it does not make SmartScreen happy. Mitigations: publish sha256 next to the download, no packers, report false positives to Kaspersky / Dr.Web / Microsoft.

### Deep links

The NSIS installer registers the `triotmetki://` scheme (`tauri-plugin-deep-link`); a second launch hands its link to the running instance. The site can link to:

| Link                               | Effect                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `triotmetki://open`                | shows the window (Home)                                                                                                        |
| `triotmetki://profile/TM1.<code>`  | opens «Сборки и профили → Профили» with the code filled into «Импорт по коду»; the player confirms the import                  |
| `triotmetki://install?preset=<id>` | opens the install wizard with that preset (`recommended`, `minimal`, `streamer`, …; unknown ids fall back to the first preset) |

Anything else is ignored. The site builds these links in `apps/web/client/features/mod/open-in-manager` («Открыть в менеджере» on the streamer settings pages and the `/mod/profile#TM1.<code>` share page) and shows a hint to install the manager when nothing opens. Links are parsed in Rust (`tauri/src/deep_link`, tested), queued for a window that is not ready yet, and routed by the UI (`app/model/hooks/use-app-sync`).

### Logs

«Собрать логи» writes `otmetki-logs-<yyyymmdd-hhmmss>.zip` to the desktop: the manager's logs (`%LOCALAPPDATA%\TriOtmetki\manager\logs`), its settings, and per client `python.log`, `version.xml`, `paths.xml`, a listing of the mods, res_mods and parked folders, `config.json`, `components.json`, `profiles.json`, `manifest.ini`, `client.ini`. Never `credentials.json`.

### What's new (`tauri/src/changelog`, `service/whats_new.rs`)

`GET /modpack/releases/changelog?limit=10` (the `modpack-releases` module) answers the release index newest first: `{releases: [{version, publishedAt, games, notes: {ru, en} | null, changes: [{id, version | null, notes | null}]}]}`. The release pipeline fills `notes` from the `## <version>` entry of the modpack `CHANGELOG.md` and `changes` from the packages whose file changed since the previous release (with their `## <id> <version>` entries); for older releases the server diffs the package files itself. The answer is cached in `%LOCALAPPDATA%\TriOtmetki\manager\changelog.json` and shown from there when offline.

- «Помощь → Что нового» lists the releases, the installed one marked, with the notes and the changed components by their catalogue titles.
- «Компоненты» marks the components changed in the installed release (or the newest one before an install) with «Новое».
- After an update Главная shows a one-time card «Модпак обновлён до X» with the release notes, «Что нового» and «Понятно» (`mark_release_seen`). The last seen version is `seenModpackVersion` in `%APPDATA%\TriOtmetki\manager\state.json`; when it is unset (the first install) it is set silently, so the card never shows on a first install.

### Problem reports (`tauri/src/report`, `service/report.rs`)

«Сообщить о проблеме» (Помощь, and the health card below) opens a dialog that collects, per selected client: `environment.txt` (manager, modpack and game versions, Windows version, enabled / disabled / missing components), the tail of the manager's newest log (64 KiB), of the game's `python.log` (160 KiB) and of `mods\configs\otmetki\otmetki.log` (128 KiB), each cut at a line start (`python.log` is decoded as UTF-8, else CP1251). Every text goes through `report::Redactor` first: the Windows user name and `C:\Users\<name>` paths, the bound account ids, e-mail addresses, `dev_…` device ids, `secret=` / `token` / `password` / `bind_code` / `authorization` / `cookie` values and `sha256=` signatures become `<user>`, `<account>`, `<email>`, `<device>`, `<redacted>`. `credentials.json` is never read into a report.

The dialog shows each part with its size and how many fragments were hidden, and the exact text behind a disclosure; the player unticks what not to send, writes what happened (up to 2000 characters) and ticks the consent. The preview is kept in memory by id: «Отправить» sends exactly those texts (`POST /mod/reports`, anonymous, rate-limited, stored 30 days, answers `{id, expires_at}`; the toast shows the report number), «Сохранить архив» writes the same texts and `message.txt` into a zip wherever the player chooses. A preview that is gone (the app restarted) is `report_expired`.

### Post-launch health (`tauri/src/health`)

`get_game_health` scans the last 4 MiB of `python.log` and `otmetki.log` for our components that failed to load: `[OTMETKI] failed to register <id>` and `failed to start` (the companion) lines, and tracebacks through `mod_otmetki_<id>.py[c]` (the game's own loader). The first exception line after it gives the kind: `outdated` (bad magic number / marshal data: a build for another client), `dependency` (`No module named` GUIFlash / OpenWG Gameface), `install` (`No module named …otmetki…`: files gone) or `error`. Only catalogue components are reported, once each, and nothing when `python.log` is older than the install recorded in `manifest.ini`. Главная shows «Компонент X не загрузился» with the fix hint for its kind, the excerpt (redacted), a switch to turn the component off and «Сообщить о проблеме»; the check reruns every minute while the window is open.

## UI and IPC

- React 19, TanStack Query for every Rust call, react-hook-form + zod for forms, `use-intl` (next-intl's core) with ru/en catalogues in `web/src/shared/i18n/locales`, Base UI primitives, SCSS modules on `@otmetki/design-tokens` (dark graphite, orange accent, gold for updates), `@otmetki/icons` + lucide, sonner toasts.
- Every command goes through `shared/api/tauri/invokeCommand({ command, schema, args })`: the response is parsed with the entity's zod schema, a rejection becomes a `ManagerError` with the Rust `ErrorCode` (title in `errors.json`, hint in `errorHelp.json`). Events (`patch-report`, `deep-link`) go through `listenEvent`.
- The Rust side is the source of truth for shapes: `cargo test` writes nothing but compares `tauri/contract/*.json` with the serialised command outputs, and each entity's `api/**/_tests` parses the same file with its schema, so a drift fails one side or the other.

## Releases

Everything is published to the VPS by [.github/workflows/release.yml](../../../.github/workflows/release.yml) (manual run; the modpack version, the supported clients and the manager version are read from the repository); there is no S3, CDN or GitHub Release. First-time setup (the VPS folder, the secrets, the key) is in [docs/ops/deploy.md §4](../../../docs/ops/deploy.md#4-game-mod-releases-on-the-vps).

1. Bump `version` in `apps/game/modpack/package.json` (the release version; `otmetki.games` there lists the supported clients) and the `VERSION` of the packages that changed, add the CHANGELOG entries; bump `version` in this `package.json` when the manager changed (the updater offers only a newer version). That `version` is the manager's only one: `tauri.conf.json` points at it and `tauri/build.rs` exposes it as `MANAGER_VERSION`; `Cargo.toml` has none. Commit and push.
2. Run `release.yml` (no inputs). `check` compares the modpack `version` (and `otmetki.games`) and this `version` with the published `releases.json` and releases only what it does not list yet; with both published it ends green with a notice. The two builds run in parallel: the packages and the catalogue (`.github/actions/modpack-release`, the same as `modpack.yml`) and this installer (`TAURI_SIGNING_PRIVATE_KEY`; it bundles no modpack files). `publish` signs the release payload (`bunx tauri signer sign`, the payload from `apps/web/server/scripts/modpack-release.ts prepare`), merges what was built into `releases.json` (`… index`: a manager-only release keeps the modpack entries, a modpack-only release keeps the `manager` block) and moves it into `DEPLOY_PATH/downloads` over SSH, `releases.json` last.
3. The result, under `https://triotmetki.ru/downloads/`:

   | Path                                                             | What                                                                          | Cache             |
   | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------- |
   | `modpack/<version>/*.mtmod`                                      | the split packages the manager installs, plus `otmetki.<version>.mtmod`       | a year, immutable |
   | `modpack/<version>/catalog/components.json`                      | the release `catalog` (+ `previews/`)                                         | a year, immutable |
   | `manager/<version>/otmetki-manager_<v>_x64-setup.exe` (+ `.sig`) | the updater target of the index's `manager` block                             | a year, immutable |
   | `otmetki-manager-setup.exe`                                      | the same installer, the site's /mod download (`MOD_DISTRIBUTION.managerUrl`)  | revalidated       |
   | `otmetki.mtmod`                                                  | the single package, «скачать пакеты вручную» (`MOD_DISTRIBUTION.packagesUrl`) | revalidated       |
   | `releases.json`                                                  | the index the API reads                                                       | revalidated       |

   Package and catalogue URLs are `https://triotmetki.ru/downloads/modpack/<version>/<file>`: the trusted host (`releases::is_trusted_host`), https, no port. A published version is cached for a year: change its contents only by publishing a new version.

## Not verified yet

- That the key orders of `gameface/key_orders.json` hold on other machines (they were taken from one client; a mismatch only brings the one restart back).
- A real Lesta install end to end: detection against a live `preferences.xml`, the move after a real patch, toggles while LGC updates the client, the NSIS uninstall hook, toasts and autostart on Windows 10.
- WebView2 rendering of the UI on 100 % / 150 % DPI; the deep-link registration after an NSIS install.
- The API endpoints on production (the module has unit and HTTP-level tests; the index is empty until the first release).
- The conflict check against real installs of XVM, PMOD and Battle Observer (masks and `meta.xml` ids), and after a real МОСТ install; the cache clear on a live client (the folder list was checked on one machine only); sound previews in WebView2; the save dialog for `.tmset` files.
- Sync, the manager's bind and problem reports against the live API (the Rust side is tested on the signing vector, the decision table, the merge and the redaction; the HTTP calls themselves only against the server's own tests); the load-failure patterns against real `python.log` files from a broken install (the test log is written after the entry scripts and Lesta's `[EXCEPTION]` format).
