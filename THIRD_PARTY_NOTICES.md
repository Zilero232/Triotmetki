# Third-party notices

The «Три отметки» code is proprietary ([LICENSE](LICENSE)); [`@otmetki/sdk`](packages/sdk) is MIT ([packages/sdk/LICENSE](packages/sdk/LICENSE)). This file lists the third-party works that ship inside our artefacts (the site, the server image, the game modpack and the modpack manager) and where each artefact keeps their licence texts. Every third-party work stays under its own licence.

«Мир танков» and all related game content are the property of Lesta Games. Game data comes from the Lesta API under its terms ([docs/research/data/lesta-api.md](docs/research/data/lesta-api.md)).

## Game modpack (`apps/game/modpack`)

The full, generated list of the modpack's assets is [apps/game/modpack/assets/THIRD_PARTY_NOTICES.md](apps/game/modpack/assets/THIRD_PARTY_NOTICES.md) (`tools/build/asset_sets.py --write`, checked by its test). Each licence text ships next to the files it covers.

### Vendored Python libraries

Vendored for the game's Python 2.7 into `packages/core/vendor` by `tools/vendor/vendor.py` (pinned by version and sha256). Their licence texts ship in the core package at `gui/mods/otmetki/core/vendor/licenses/`.

| Library | Version | Licence      | Copyright                       |
| ------- | ------- | ------------ | ------------------------------- |
| six     | 1.17.0  | MIT          | (c) 2010-2024 Benjamin Peterson |
| blinker | 1.5     | MIT          | (c) 2010 Jason Kirtland         |
| attrs   | 21.4.0  | MIT          | (c) 2015 Hynek Schlawack        |
| enum34  | 1.1.10  | BSD-3-Clause | (c) 2013 Ethan Furman           |

### Assets

| Asset                                               | Author                                     | Licence               | Licence text                                           |
| --------------------------------------------------- | ------------------------------------------ | --------------------- | ------------------------------------------------------ |
| Crosshair Pack 1.1 (3 of 200 marks)                 | Kenney (www.kenney.nl)                     | CC0-1.0               | `assets/third_party/kenney_crosshair_pack/License.txt` |
| BattleHits shell and hit-effect models (hit viewer) | Andrii Andrushchyshyn (poliroid)           | MIT                   | `assets/third_party/battlehits/LICENSE.md`             |
| Crosshair marks, icons, glyphs                      | Три отметки                                | proprietary (our own) | `assets/otmetki/LICENSE.md`                            |
| Fira Sans (Regular, Bold)                           | The Mozilla Foundation and Telefonica S.A. | OFL-1.1               | `catalog/fonts/OFL.txt`                                |

The hit viewer's 3D view follows the approach of poliroid's BattleHits (MIT, https://gitlab.com/wot-public-mods/battle-hits): our code is a reimplementation; its shell and outcome-marker models (`.model`, `.visual`, `.primitives`, `.dds`) ship unmodified at their original in-game path `res/content/battlehits/`, with its licence text next to them.

Fira Sans is used only at build time: setupkit renders the component preview images with it (`tools/build/setupkit/artwork`). The font files themselves are not shipped to players; the previews contain only rendered text.

### Gameface UI bundles

The in-game pages (`packages/ui/gameface`, built from `ui-web`) bundle these npm packages: react, react-dom and scheduler (MIT, Meta Platforms), zod (MIT), nanostores and @nanostores/react (MIT), clsx (MIT), date-fns (MIT), remeda (MIT), react-error-boundary (MIT), @siberiacancode/reactuse (MIT) and icons from lucide-react (ISC).

### Runtime dependency mods

Third-party mods our packages need at run time. They are not part of our packages: the manager downloads each pinned release from its author (sha256-checked), downloads its licence and saves it to `clients\<key>\notices\<id>\LICENSE`, and lists the authors and licences on its «О программе» page. Pins live in [apps/game/modpack/catalog/catalog.json](apps/game/modpack/catalog/catalog.json) (`kind: "dependency"`).

| Mod             | Version | Author                                    | Licence | Source                                       |
| --------------- | ------- | ----------------------------------------- | ------- | -------------------------------------------- |
| OpenWG Gameface | 1.2.2   | OpenWG                                    | MIT     | https://gitlab.com/openwg/wot.gameface       |
| GUIFlash        | 0.6.6   | CH4MPi (GambitER, Kurzdor, StranikS_Scan) | MIT     | https://github.com/CH4MPi/GUIFlash           |
| ModsList        | 1.6.01  | poliroid (Andrii Andruschyshyn)           | MIT     | https://gitlab.com/wot-public-mods/mods-list |

## Modpack manager (`apps/game/manager`)

- **Fonts:** Fira Sans, Fira Sans Condensed (The Mozilla Foundation and Telefonica S.A.) and JetBrains Mono (The JetBrains Mono Project Authors), all OFL-1.1, bundled through `@fontsource/*`.
- **Web UI (npm):** React, Base UI, TanStack Query, react-hook-form, zod, motion, sonner, use-intl, lucide-react, date-fns, ts-pattern, class-variance-authority, clsx and the Tauri JS API and plugins; all MIT, ISC or Apache-2.0 / MIT.
- **Rust core (crates):** Tauri 2 and its plugins plus their dependency tree, overwhelmingly MIT and/or Apache-2.0. The authoritative list is `apps/game/manager/tauri/Cargo.lock`; `cargo about generate` or `cargo license` (run in `apps/game/manager/tauri`) prints every crate with its licence.

## Site and server (`apps/web/client`, `apps/web/server`)

- **Fonts:** Fira Sans, Fira Sans Condensed and JetBrains Mono (OFL-1.1), self-hosted at build time by `next/font/google`.
- **Icons:** lucide-react (ISC) and our own `@otmetki/icons`.
- **Replay parser** (`apps/web/server/src/lib/replay`): format knowledge and two test fixtures from wot-battle-results-parser (MIT, (c) 2022 dacite); the full notice is [apps/web/server/src/lib/replay/NOTICE](apps/web/server/src/lib/replay/NOTICE).

## npm dependencies

Every npm package keeps its own licence; the texts are in each package under `node_modules/<name>/`. A summary of the production dependency trees (`bunx license-checker-rseidelsohn --production --summary --start <workspace>`, 2026-10-05):

- **Almost everything** is MIT, ISC, Apache-2.0, BSD-2-Clause / BSD-3-Clause, BlueOak-1.0.0, 0BSD, MIT-0, CC0-1.0 or Unlicense.
- **MPL-2.0** (file-level copyleft, used unmodified): `@resvg/resvg-js`, `satori`, `web-push`, `lightningcss` (build only).
- **EPL-2.0:** `elkjs` (server, pulled in by the Prisma CLI's Studio; used unmodified).
- **CC-BY-4.0:** `caniuse-lite` (browser support data, build only).
- **Python-2.0:** `argparse` (the JavaScript port, a transitive tooling dependency).

Run the same command to get the current list, or add `--csv` for every package with its licence.
