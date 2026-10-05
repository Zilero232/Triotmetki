# Три отметки

All-in-one companion platform for «Мир танков» (Lesta, RU realm). Bun-workspaces monorepo. Production domains: site `https://triotmetki.ru`, API `https://api.triotmetki.ru`.

- Product scope: [docs/product/features.md](docs/product/features.md)
- Architecture: [docs/specs/2026-09-24-otmetki-design.md](docs/specs/2026-09-24-otmetki-design.md)
- Lesta API reference and terms: [docs/research/data/lesta-api.md](docs/research/data/lesta-api.md)
- External library docs (context7 ids): [docs/guides/shared/references.md](docs/guides/shared/references.md)
- First production deploy checklist: [docs/ops/deploy.md](docs/ops/deploy.md)

Respond to the user in Russian. Code, comments, docs and commits are in English. UI text is in Russian and English via next-intl.

## Layout

| Path                     | What                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/client`        | Next.js 16 / React 19 site, FSD (see [docs/architecture/fsd.md](docs/architecture/fsd.md)), SCSS modules, `motion`, visx charts, next-intl — [CLAUDE.md](apps/web/client/CLAUDE.md)                                                                                                                                                                                                                   |
| `apps/web/server`        | NestJS 11 on Bun, two entrypoints from one image: `src/main.ts` (site API, developer API `/v1`, auth, mod ingest) and `src/worker.ts` (the collector: BullMQ jobs that pull the Lesta API into TimescaleDB). Owns the Prisma schema (synced with `db push`, no migrations before production), the Lesta client, the replay parser and the game-data importer — [CLAUDE.md](apps/web/server/CLAUDE.md) |
| `apps/game/modpack`      | Python 2.7 `.mtmod` game-client modpack (core, companion, features) and its component catalogue — [CLAUDE.md](apps/game/modpack/CLAUDE.md)                                                                                                                                                                                                                                                            |
| `apps/game/manager`      | Tauri 2 modpack manager (Rust core in `tauri/`, React UI in `web/`): installs the modpack, toggles components, profiles and sets, moves the modpack after a client patch; the site's /mod download — [CLAUDE.md](apps/game/manager/CLAUDE.md)                                                                                                                                                         |
| `packages/ratings`       | Pure rating math: WN8, EFF, Броня-Индекс, rating tiers, recent periods, MoE projection                                                                                                                                                                                                                                                                                                                |
| `packages/schemas`       | Zod contracts shared by the client and the server                                                                                                                                                                                                                                                                                                                                                     |
| `packages/gamedata`      | Pure loadout calculator (`calculateLoadout`) and the game-data model it reads; the importer lives in the server                                                                                                                                                                                                                                                                                       |
| `packages/icons`         | Custom SVG icon set as React components; `@otmetki/icons/shapes` is its framework-free geometry                                                                                                                                                                                                                                                                                                       |
| `packages/design-tokens` | Design tokens as SCSS maps and mixins (colours per theme, scale, motion, surfaces, textures); the client emits them as CSS variables, the modpack's Gameface window inlines them; `readDesignTokens()` reads the values in Node                                                                                                                                                                       |
| `packages/sdk`           | `@otmetki/sdk`: TypeScript client for the public `/v1` API, generated from its OpenAPI spec, plus webhook verification ([README](packages/sdk/README.md))                                                                                                                                                                                                                                             |
| `packages/logger`        | pino wrapper                                                                                                                                                                                                                                                                                                                                                                                          |
| `e2e/`                   | Playwright smoke tests over the public pages                                                                                                                                                                                                                                                                                                                                                          |
| `infra/caddy/`           | Caddyfile for the prod-like [docker-compose.yml](docker-compose.yml) (no production deploy yet)                                                                                                                                                                                                                                                                                                       |

`packages/` holds only code shared between apps; anything a single app uses lives inside that app.

## Commands

```bash
bun install
bun run dev:infra      # TimescaleDB :5434, Redis :6380, Mailpit SMTP :1025 (inbox :8025)
bun run db:push        # extensions + prisma db push + generate + the Timescale layer (no migrations before production)
bun run db:reset       # drop everything, then the same as db:push
bun run dev            # server :4000 + client :3000 (no worker)
bun run dev:all        # + worker (collector jobs, schedules)
bun run dev:manager    # modpack manager (Tauri)
bun run dev:modpack    # modpack dev loop: build, install into the local client's mods/<version>/otmetki-dev, reinstall on change
bun run verify         # typecheck + lint + lint:cycles + UTF-8 check + format:check + lint:css
bun run test           # vitest (never `bun test`)
bun run test:changed   # only the tests the uncommitted changes reach
bun run test:e2e       # playwright smoke (starts the client dev server itself)
bun run test:modpack   # python suites of the game modpack
bun run lint:unused    # knip — unused files, exports and dependencies
bun run lint:dupes     # jscpd — copy-pasted code
```

Deploy ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) runs manually (workflow_dispatch): `verify` + `test` + the modpack suite + the e2e smoke (a gate job skips the checks a tree already passed), then builds the client and server images to ghcr and rolls them out on the VPS (`db:deploy` — extensions, `prisma db push`, the Timescale layer — then `up -d` and health checks). First deploy: [docs/ops/deploy.md](docs/ops/deploy.md). The other workflows are [.github/workflows/modpack.yml](.github/workflows/modpack.yml) (the modpack checks on pull requests that touch `apps/game/modpack`, plus a manual release build of the packages and the component catalogue the manager ships) and [.github/workflows/manager.yml](.github/workflows/manager.yml) (the manager's UI and Rust checks on Windows, plus a manual `tauri build` of its NSIS installer). [.github/workflows/release.yml](.github/workflows/release.yml) (manual; to release bump `version` in `apps/game/modpack/package.json` (the supported clients are its `otmetki.games`) or in `apps/game/manager/package.json`, commit, run it) publishes whichever of the modpack and the manager has a version not yet in the published index to the VPS: everything is stored there (replays and armor models on the `serverdata` volume, public downloads in `DEPLOY_PATH/downloads`, served by Caddy at `/downloads/`); there is no S3 and no CDN.

## Rules

The full style guide is [docs/guides/](docs/guides/README.md) (split into `client/`, `server/`, `shared/`); every doc is indexed in [docs/README.md](docs/README.md). Digests in `.claude/rules/` load automatically by path, one topic per file: `shared/` (TypeScript everywhere), `client/`, `server/`, `modpack/`, `testing/` (tests: [.claude/rules/testing/](.claude/rules/testing/shared/location.md)). The key rules:

- **Packages before custom code.** Before building any non-trivial piece (replay parser, rate limiter, charts, drag-n-drop, canvas board, OG images, 3D, OpenAPI, SDK generation, bot framework…), search npm/PyPI/GitHub for a maintained package and use it. Write it yourself only when nothing fits, and say why in the commit.
- **Reuse over reinvention.** Before writing a helper, check what is already installed: remeda, ts-pattern, date-fns, zod, @siberiacancode/reactuse, TanStack Query / Table / Virtual, @base-ui/react, class-variance-authority, cmdk, visx, lucide-react + `@otmetki/icons`, sonner, motion, p-retry — and the workspace packages: `@otmetki/ratings` for rating math, the server's `lib/lesta` client (through `core/lesta`) for every Lesta call, `@otmetki/schemas` for every shared contract (server-only request validation may live in a module's `dto/*.schemas.ts`; the client reads it through the generated `z*` schemas). Forms use react-hook-form + `@hookform/resolvers/zod`, inside a `model/hooks/use-<x>-form/` hook.
- **Types and parameters.** Use `type`, never `interface`. A function with two or more parameters takes one object, whose shape goes in a sibling `*.types.ts`.
- **Constants.** Constants that belong together live in one `as const` object.
- **No comments in app code.** An `eslint-disable-next-line` carries its reason after `--`; tool and build configs (`eslint.config.mjs`, `stylelint.config.mjs`, the client's `next.config.ts` and `config/*.ts`) may explain why a rule is bent.
- **ESLint owns the shape.** Arrow functions use an expression body when they only return (`arrow-body-style: as-needed`); every `if`/`else` body has braces (`curly: all`); import order and blank lines are autofixed. `bun run fix` applies all of it.
- **i18n.** Every user-facing string goes through next-intl, in both languages: `shared/i18n/locales/{ru,en}/<namespace>.json` (one file per namespace, same keys in both languages).
- **Dependency versions.** Versions shared between workspaces live only in the root `catalog`.
- **Tests.** Tests go in `_tests/` next to the source.
- **Lesta terms are hard constraints** ([docs/research/data/lesta-api.md](docs/research/data/lesta-api.md)):
  - every page carries the attribution footer;
  - never ask for Lesta credentials, only use Lesta ID OpenID;
  - no ads;
  - honour data retention and deletion.
- **Fair play.** The mod never reads or shows enemy information beyond what the client shows: no positions, no reload timers, no aim data, no ally-spot markers. Allowed: own battle results, own shots, MoE %, session stats.
- **Git.** Never run git operations unless the user asks.

New design specs go in `docs/specs/YYYY-MM-DD-<topic>.md`. Do not use `docs/superpowers/specs/`.
