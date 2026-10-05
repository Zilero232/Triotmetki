# @otmetki/client

The Three Marks website ([triotmetki.ru](https://triotmetki.ru)): Next.js 16 / React 19 with the App Router, `cacheComponents` and the React Compiler, shipped as a standalone Node server ([Dockerfile](Dockerfile)) behind Caddy.

- **Architecture:** Feature-Sliced Design with `views` instead of `pages` and the design system in `ui-kit` ([docs/architecture/fsd.md](../../../docs/architecture/fsd.md)). The layer map and rules are in [CLAUDE.md](CLAUDE.md), the code style in [docs/guides/client](../../../docs/guides/README.md).
- **Stack:** next-intl (every string in `shared/i18n/locales/{ru,en}`), TanStack Query / Table / Virtual, Base UI, visx charts, motion, SCSS modules on `@otmetki/design-tokens`, react-hook-form + zod, serwist for the PWA.
- **API:** the server's internal OpenAPI spec is committed at `shared/api/openapi/internal.json`; the typed client in `shared/api/generated` is git-ignored and built from it.

## Run

From the repo root, with the server running (`bun run dev` starts both):

```bash
bun run dev:client   # next dev on :3000
```

Environment (root `.env`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `INTERNAL_API_TOKEN` (the same value as the server's, at least 32 characters) and `LESTA_NOTICE` (the «data not connected yet» banner, read at runtime). See [.env.example](../../../.env.example).

## Scripts

| Script                    | What                                                                   |
| ------------------------- | ---------------------------------------------------------------------- |
| `dev` · `build` · `start` | Next dev server, production build, production server on :3000          |
| `api:generate`            | export the server's internal spec, format it and regenerate the client |
| `api:build`               | regenerate the client from the committed spec (offline)                |
| `panel:build`             | rebuild the Twitch panel script (`public/twitch-panel.js`)             |
| `lint:cycles`             | the import-cycle check (madge), also run by the root `bun run verify`  |
| `typecheck`               | `next typegen`, then `tsc` for the app and the service worker          |

## Tests

```bash
bun run test                     # from the repo root (Vitest, never `bun test`)
bunx vitest run apps/web/client  # only the client
bun run test:e2e                 # Playwright smoke over the public pages (starts the dev server)
```

Unit tests live in `_tests/` next to the source.

## Licence

Proprietary, see [LICENSE](../../../LICENSE). Fonts and icons used by the site are listed in [THIRD_PARTY_NOTICES.md](../../../THIRD_PARTY_NOTICES.md).
