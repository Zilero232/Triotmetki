---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
---

<!-- Compressed editing rules, loaded automatically when a TS/JS file is edited. -->
<!-- The full guide is docs/guides/ (index: docs/guides/README.md); the root CLAUDE.md carries the key rules. Keep them in sync. -->

# Structure — folders per concern

## Folders are one concern, not one function

**Every thing is a folder.** A file that has companions (`x.ts` + `x.types.ts`,
`x.constants.ts`, `x.schemas.ts`, `_tests/`) lives in its own `x/` folder with an
`index.ts`. Nothing lies flat next to another concern: a folder holds its own
concern's files and subfolders, and a second concern gets a second folder. Only
`config/` stays flat — one `<concern>.constants.ts` per concern until one grows a
companion. Shared helper folders are flat, one per concern, hooks prefixed `use-`
(`shared/lib/<concern>/`, `shared/lib/use-<x>/`) — no `hooks/` or `utils/` grouping.

A `lib/<concern>/` or `model/hooks/use-<x>/` folder gets its own `index.ts`,
`<name>.ts`, `<name>.types.ts` where needed and `_tests/`. Related helpers share
one concern folder rather than one folder per function.

**The server app is the exception.** `apps/web/server` keeps one file per topic inside a
module segment and barrels only at module boundaries; its `lib/<concern>/` folders follow
this rule. See `server/structure/service-files.md`.

Never a `*.helpers.ts`, `*.utils.ts` or `*.constants.ts` beside a component:
helpers go to `lib/<concern>/` (project-agnostic ones to `shared/lib/<concern>/`),
constants to `config/<concern>.constants.ts`. The client's component-folder rules
are in `client/structure/slice-layout.md`.
