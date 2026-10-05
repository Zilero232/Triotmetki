---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
---

<!-- Compressed editing rules, loaded automatically when a TS/JS file is edited. -->
<!-- The full reasoning is docs/guides/shared/checklist.md; keep them in sync. -->

# Verification

## Verify before claiming anything works

A change is verified with **typecheck, lint and the tests it touches**:
`bun run verify` (typecheck, ESLint, the client's import-cycle check, Prettier,
Stylelint, encoding) plus `bun run test` — or the targeted form, `bun run typecheck`,
`eslint <path>`, `bun run test:changed` and `bunx vitest run --project <workspace>`. A change
to server queries also runs `bun run test:db` (needs `bun run dev:infra`). Bare `bun test` is Bun's own runner and
fails the suite. There is no per-push CI: the manual deploy workflow
(`.github/workflows/deploy.yml`, `checks` job) runs both before any image is built, and its `gate` job skips them for a tree that
already passed.

**No production build unless the owner asks for one.** `bun --filter @otmetki/client build`
is slow and is not part of routine verification. It is still the only check that
catches prerender breakage — a page that typechecks but throws during SSR, or a
missing translation key surfacing as `MISSING_MESSAGE` — so when a build is asked for,
the first one after client work is where to watch the prerender output, and a change
that could affect prerendering is called out in the report instead of being built on
the side.
