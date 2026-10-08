# @otmetki/client

The Три отметки website, [triotmetki.ru](https://triotmetki.ru). A Next.js 16 / React 19 app (App Router, `cacheComponents`, React Compiler) in Feature-Sliced Design, shipped as a standalone Node server ([Dockerfile](Dockerfile)) behind Caddy. It reads everything from the API in [apps/web/server](../server/README.md); there are no mocks, and pages without data show empty states.

## Features

- Player profiles, sessions, recent periods, compare, signatures; tanks, tier lists, builds, 3D armor, tech tree; marks of excellence; clans, replays, maps, tactics, tournaments; streamer tools; Plus; the developer cabinet. The full catalogue is [docs/product/features.md](../../../docs/product/features.md).
- ru and en through next-intl (`shared/i18n/locales/{ru,en}`), dark and light themes, PWA (serwist), SEO with OG images, sitemap and JSON-LD.
- Stack: TanStack Query / Table / Virtual, Base UI, visx charts, motion, SCSS modules on [`@otmetki/design-tokens`](../../../packages/design-tokens/README.md), react-hook-form + zod, three.js for the armor viewer.

## Quick start

From the repo root, after the [root quick start](../../../README.md#quick-start) (`.env`, `dev:infra`, `db:push`):

```bash
bun run dev          # server :4000 + client :3000
bun run dev:client   # the client alone, next dev on :3000
```

Environment (root `.env`, see [.env.example](../../../.env.example)):

| Variable               | What                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | the API base URL (build-time)                                                            |
| `NEXT_PUBLIC_SITE_URL` | the site's own URL (build-time)                                                          |
| `INTERNAL_API_TOKEN`   | signs the Next server's calls to the API; the same value as the server's, 32+ characters |
| `LESTA_NOTICE`         | `true` shows the «data not connected yet» banner; read per request, no rebuild           |

## Layout

| Path                                   | What                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `app/`                                 | Next.js routes (`[locale]/…`), OG images, sitemap, robots, manifest, the service worker                   |
| `views/`                               | one screen per route (the FSD `pages` layer, named `views` here)                                          |
| `widgets/` · `features/` · `entities/` | FSD layers; imports go downward only                                                                      |
| `shared/`                              | project-agnostic code: `api/` (HTTP, generated client, query options), `i18n/`, `lib/`, `seo/`, `styles/` |
| `ui-kit/`                              | the design system: atoms, molecules, organisms (charts, data tables, page headers)                        |
| `config/`                              | build-time helpers for `next.config.ts`: CSP, redirects, dev-server settings, the Twitch panel build      |

The layer map and rules are in [CLAUDE.md](CLAUDE.md) and [docs/architecture/fsd.md](../../../docs/architecture/fsd.md).

**API client.** The server's internal OpenAPI spec is committed at `shared/api/openapi/internal.json`; the typed client in `shared/api/generated` is git-ignored and built from it with `@hey-api/openapi-ts`.

## Commands

Run from this folder (`bun run <script>`) or from the root with `bun --filter @otmetki/client <script>`.

| Script                    | What                                                                |
| ------------------------- | ------------------------------------------------------------------- |
| `dev` · `build` · `start` | next dev, production build, production server, all on :3000         |
| `api:generate`            | export the server's internal spec, format it, regenerate the client |
| `api:build`               | regenerate the client from the committed spec (offline)             |
| `panel:build`             | rebuild the Twitch panel script (`public/twitch-panel.js`)          |
| `lint:cycles`             | the import-cycle check (madge); part of the root `bun run verify`   |
| `typecheck`               | `next typegen`, then `tsc` for the app and the service worker       |

## Testing

```bash
bun run test                     # from the repo root: Vitest (never `bun test`)
bunx vitest run apps/web/client  # only the client
bun run test:e2e                 # Playwright smoke over the public pages (starts the dev server)
```

Unit tests live in `_tests/` next to the source. The e2e specs are in [e2e/](../../../e2e).

## Deploy

The [deploy workflow](../../../.github/workflows/deploy.yml) builds the image from [Dockerfile](Dockerfile) with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` as build args, pushes it to ghcr and rolls it out with [docker-compose.yml](../../../docker-compose.yml). Details: [docs/ops/deploy.md](../../../docs/ops/deploy.md).

## Docs

- [CLAUDE.md](CLAUDE.md): layer map and the conventions that bite.
- [docs/guides/client/](../../../docs/guides/README.md): the client style guide.
- [docs/architecture/fsd.md](../../../docs/architecture/fsd.md): Feature-Sliced Design as used here.

## Licence

Proprietary, see [LICENSE](../../../LICENSE). Fonts and icons the site uses are listed in [THIRD_PARTY_NOTICES.md](../../../THIRD_PARTY_NOTICES.md).
