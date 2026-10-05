---
paths:
  - "**/_tests/**/*.{ts,tsx}"
  - "e2e/**/*.spec.ts"
  - "**/vitest.config.*"
  - "playwright.config.ts"
  - "apps/game/modpack/**/tests/**"
---

<!-- Auto-loaded when editing tests or their configs. Full picture — the root CLAUDE.md. -->

# Tests — where they live

## Tests sit next to what they test

A Vitest suite lives in a `_tests/` folder beside the source, named after it:
`shared/i18n/locale-path/_tests/locale-path.test.ts`. Playwright specs live in
`e2e/`. Only pure logic and components with behaviour are covered — anything
needing Redis or the live Lesta API is verified by running it. The server's query
functions are the exception: they run against a throwaway TimescaleDB in the
`server-db` project (`*.db.test.ts`, `testing/environment/server.md`).

## Where they live

A unit test goes in a `_tests/` folder next to the file under test, named after it:

```text
packages/ratings/src/eff/
├── eff.ts
├── index.ts
└── _tests/eff.test.ts
```

Not `__tests__`, not a bare test file beside the source, not a separate `tests/` tree at the workspace root. Browser E2E specs live only in the root [e2e/](../../../../e2e/) with a `.spec.ts` extension. The server's HTTP-level suites — a Nest app built from the real modules with mocked collaborators and driven through `supertest` — are Vitest files named `*.e2e.test.ts` in the module's own `_tests/` (`marks/_tests`, `public-api/_tests`, `replays/_tests`).

Fixtures shared by several suites live in the `_tests/` of the concern they build (`ratings/src/stats/_tests/fixtures.ts`, `collector/tracking/lib/poll-pipeline/_tests/poll-pipeline.fixtures.ts`), never in a `_tests/` at a source root.

The one exception is the game modpack — see `modpack/tests.md`.
