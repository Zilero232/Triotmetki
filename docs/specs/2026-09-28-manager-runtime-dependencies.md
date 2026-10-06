# Manager: third-party runtime dependencies in the component catalogue

Status: implemented. The manager side: `apps/game/manager/tauri/src/dependencies`, `releases/sources.rs`, the install wizard, the «Компоненты» toggle and the update after a patch. The catalogue side: both entries are in `apps/game/modpack/catalog/catalog.json`, setupkit checks them and passes them through, the МОСТ bundler lists them as third-party mods, and `requiredBy` is checked against the code (`apps/game/modpack/tools/build/setupkit/manifest/tests/test_dependencies.py`), which adds `session_stats` (its hangar label) to the proposal below.

Superseded in part (2026-10-06, modpack 0.3.5 follow-up): GUIFlash was dropped, the dependencies are OpenWG Gameface and ModsList (both required).

## Why

The modpack's in-game window and Gameface HUD need OpenWG Gameface, and the fallback HUD renderer needs GUIFlash 0.6.x (modpack README «Battle HUD», «References and licences», «Install (players)» step 3). Players install both by hand today. Both are MIT, which allows redistribution with the copyright and licence notice, so the manager can fetch the authors' own release files, check them against a pinned sha256 and keep the licence next to the install. We never vendor them into our packages.

## Pinned releases (checked 2026-09-28)

| Dependency      | Release                                                                                                                                                                                                   | File                              | Size   | sha256                                                             | Licence file (sha256)                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenWG Gameface | v1.2.2, 2026-09-21, [gitlab.com/openwg/wot.gameface/-/releases](https://gitlab.com/openwg/wot.gameface/-/releases) (`.mtmod` = the Lesta build; `.wotmod` = WG)                                            | `net.openwg.gameface_1.2.2.mtmod` | 48445  | `2bb65f28663e3ab34b5a1102a1bbd1f6e17a65e1f6a898a8645c4ab732b50184` | `https://gitlab.com/openwg/wot.gameface/-/raw/v1.2.2/LICENSE` (`ae7fdf07fd99a0c2c616ace3d07b50d7063a33a3bc6a9173098aa75bc93833a9`), not inside the `.mtmod` |
| GUIFlash        | v0.6.6, 2026-09-01, [github.com/CH4MPi/GUIFlash/releases/tag/v0.6.6](https://github.com/CH4MPi/GUIFlash/releases/tag/v0.6.6)                                                                               | `gambiter.guiflash_0.6.6.mtmod`   | 62862  | `a0b6dc2e75663008a4ced9e0c00449be84b3c3d5d932f8bbcaa2b334ae3d1cb5` | `https://raw.githubusercontent.com/CH4MPi/GUIFlash/v0.6.6/LICENSE` (`516fddc54dc15c2589d40017fc985adc59565ff7fbe8e7bc16851205126dd7fc`, the same text as the `LICENSE` inside the `.mtmod`) |

OpenWG Gameface publishes its releases on **GitLab only** (the `openwg` GitHub organisation has no such repository). The release links there are project uploads; the stable download URL is `https://gitlab.com/-/project/68695173/uploads/<hash>/<file>` (the `/openwg/wot.gameface/uploads/...` form answers 404). GitHub release assets redirect to `release-assets.githubusercontent.com`; the manager follows only that redirect.

## Request: `catalog.json` and `components.json`

Add the two entries to `components[]` of the generated `components.json`, marked `kind: "dependency"`. setupkit has to pass them through as they are: they have no package in `dist/`, no category or presets, and `--strict` must not treat them as a catalogue entry without a package. `requiredBy` lists our component ids; the manager ticks a dependency when any of them is selected.

```json
{
  "id": "openwg_gameface",
  "kind": "dependency",
  "packageId": "net.openwg.gameface",
  "version": "1.2.2",
  "file": "net.openwg.gameface_1.2.2.mtmod",
  "title": { "ru": "OpenWG Gameface", "en": "OpenWG Gameface" },
  "description": {
    "ru": "Библиотека интерфейса Gameface: окно модпака и HUD на Gameface",
    "en": "The Gameface UI library: the modpack window and the Gameface HUD"
  },
  "author": { "name": "OpenWG", "url": "https://gitlab.com/openwg/wot.gameface" },
  "licence": {
    "name": "MIT",
    "url": "https://gitlab.com/openwg/wot.gameface/-/raw/v1.2.2/LICENSE",
    "sha256": "ae7fdf07fd99a0c2c616ace3d07b50d7063a33a3bc6a9173098aa75bc93833a9"
  },
  "sourceUrl": "https://gitlab.com/-/project/68695173/uploads/43577d5bab856523c1b7a6dcada27f23/net.openwg.gameface_1.2.2.mtmod",
  "sha256": "2bb65f28663e3ab34b5a1102a1bbd1f6e17a65e1f6a898a8645c4ab732b50184",
  "size": 48445,
  "requiredBy": ["ui", "marks_panel", "damage_log", "hit_log", "team_hp", "sixth_sense", "battle_clock", "crosshair", "hangar_info", "hangar_ratings", "hangar_marks", "marks_history"],
  "restartRequired": true
}
```

```json
{
  "id": "guiflash",
  "kind": "dependency",
  "packageId": "gambiter.guiflash",
  "version": "0.6.6",
  "file": "gambiter.guiflash_0.6.6.mtmod",
  "title": { "ru": "GUIFlash", "en": "GUIFlash" },
  "description": {
    "ru": "Запасной вывод панелей на экран, если Gameface недоступен",
    "en": "The fallback renderer for the on-screen panels when Gameface is unavailable"
  },
  "author": { "name": "CH4MPi (GambitER, Kurzdor, StranikS_Scan)", "url": "https://github.com/CH4MPi/GUIFlash" },
  "licence": {
    "name": "MIT",
    "url": "https://raw.githubusercontent.com/CH4MPi/GUIFlash/v0.6.6/LICENSE",
    "sha256": "516fddc54dc15c2589d40017fc985adc59565ff7fbe8e7bc16851205126dd7fc"
  },
  "sourceUrl": "https://github.com/CH4MPi/GUIFlash/releases/download/v0.6.6/gambiter.guiflash_0.6.6.mtmod",
  "sha256": "a0b6dc2e75663008a4ced9e0c00449be84b3c3d5d932f8bbcaa2b334ae3d1cb5",
  "size": 62862,
  "requiredBy": ["marks_panel", "damage_log", "hit_log", "team_hp", "sixth_sense", "battle_clock", "crosshair", "hangar_info", "hangar_ratings", "hangar_marks", "marks_history"],
  "restartRequired": false
}
```

The `requiredBy` lists are a proposal from the modpack README (the HUD panels and the hangar labels need a renderer, the ui package needs Gameface); the owner knows the exact set.

## Request: rows for `catalog/README.md` «components.json»

| Field                                             | From                                                                                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`                                            | `"dependency"` for a third-party runtime dependency; absent for our packages                                                                             |
| `author {name, url}`, `licence {name, url, sha256}` | dependency only: the upstream author and licence; `licence.url` is the pinned licence text the manager saves in `notices\<id>\LICENSE`                 |
| `sourceUrl`, `sha256`, `size`                     | dependency only: the upstream release file, pinned; the manager downloads nothing else and refuses a different hash                                      |
| `requiredBy`                                      | dependency only: our component ids that need it; the wizard ticks it when one is selected                                                                |
| `restartRequired`                                 | dependency only: the client restarts once after the first start with it (OpenWG Gameface's `res_map` registration)                                         |

And one sentence under the table: «Entries with `kind: "dependency"` are not our packages: `packageId` and `file` must not match `ownedPatterns`, and `file` is `<packageId>_<version>.mtmod`. The manager installs them only when the player has no copy, and removes only what it installed ([manager README «Runtime dependencies»](../../manager/README.md#runtime-dependencies-taurisrcdependencies)).»

## Manager contract (implemented)

- Rust: `catalog::DependencyComponent`, split out of `components[]` into `Catalog.dependencies` at parse (an invalid entry is skipped with a log line); `dependencies::{resolve, inspect, to_download, fetch, install, remove_owned, carry}`; `manifest.ini [dependencies] <id>=ours|<file>|<sha256>` or `user|<file>|`; `ReleasesClient::fetch_dependency` with the pinned allowlist of `releases/sources.rs`.
- IPC: `get_catalog` / `prepare_install` carry `dependencies` (the catalogue entries) and `InstallPlan.dependencies` (`{id, state: missing | ours | outdated | user, file}`); `install_modpack` takes `excludedDependencies`.
- UI: `catalogDependencySchema`, `dependencyStatusSchema`, the wizard's «Нужные библиотеки» list (`features/setup/install-modpack/lib/dependencies`).

## Not covered yet

- A dependency the selection no longer needs stays until uninstall.
- Switching a component on does not remember a dependency the player unticked in the wizard: it installs every missing one the component needs.
- A migration (patch, same modpack version) only carries the owned files; a newer pin arrives with the next modpack update or wizard install.

## Optional dependencies and the ModsList pin (2026-09-30)

A dependency entry may carry `optional: true` (default `false`): it only improves our components, they work without it. The wizard lists it with the others (`requiredBy`), ticked by default with an «Необязательно / Optional» badge, and the player may untick it (`excludedDependencies`); `dependencies::needed_to_enable` leaves it out, so switching a component on in «Компоненты» never downloads it, and the component card does not list it among its libraries. Everything else (inspect, the player's copy, update, carry, uninstall) is the same as for a required one. Game health needs no marker for it: our code imports ModsList behind a guard, so its absence never raises `No module named`.

| Dependency | Release                                                                                                                                                    | File                                   | Size  | sha256                                                             | Licence file (sha256)                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| ModsList   | v1.6.01, 2025-02-21, [gitlab.com/wot-public-mods/mods-list](https://gitlab.com/wot-public-mods/mods-list) (upstream `.wotmod`, saved as `.mtmod`), optional | `me.poliroid.modslistapi_1.6.01.mtmod` | 79776 | `b312adfcd005405d49b711e79b4032be7d624b6e38d4156364d1c04bc5dba71f` | `https://gitlab.com/wot-public-mods/mods-list/-/raw/v1.6.01/LICENSE.md` (`c67ed29b3f80fa7b99e6fc16490fa1710353fb7ead042c276e8dccd2dbeedb5f`) |

poliroid (Andrii Andruschyshyn, MIT, © 2015-2025) publishes ModsList only on GitLab, project id 26509092; the file is `https://gitlab.com/-/project/26509092/uploads/9705f0b2627e9a074ecac2e84f38c9ca/me.poliroid.modslistapi_1.6.01.wotmod`, answering 200 without a redirect. 1.6.01 is the last Scaleform build: 1.7+ moved the button to Gameface and hooks the WG-only `LobbyFooter`, 1.8 needs WG 2.4.1 `R.mods`. It is byte-identical to the copy the Lesta modpacks of Jove and Near_You ship. `requiredBy: ["ui"]`: the button opens the «Три отметки» window. The allowlist (`releases/sources.rs`) gains `gitlab.com/-/project/26509092/uploads/` and `gitlab.com/wot-public-mods/mods-list/-/raw/`.
