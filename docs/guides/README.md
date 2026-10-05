# Three Marks Style Guide

Project code-style conventions for `apps/web/client/`, plus the parts of the server app and the shared packages that the client touches. Architectural rules live in [`docs/architecture/fsd.md`](../architecture/fsd.md).

Tools:

- **ESLint** (`bun lint` / `bun lint:fix`) — linter + import sorting (`perfectionist/sort-imports`) + JSX prop sorting (`perfectionist/sort-jsx-props`) + `padding-line-between-statements`. Config: the root `eslint.config.mjs`, on top of `@siberiacancode/eslint`.
- **Prettier** (`bun format` / `bun format:check`) — formatter. Config: `prettier.config.mjs`.
- **Stylelint** (`bun lint:css`) — SCSS modules, `stylelint-config-standard-scss` + `stylelint-config-idiomatic-order`.
- **TypeScript** strict + `noUnusedLocals` + `noUnusedParameters`.
- FSD boundaries and a handful of React conventions are kept by hand and caught at review (the linter does not cover hook order or FSD cross-slice imports).

**Why ESLint + Prettier:** the `@siberiacancode/*` configs already carry a rule set for
React/TS/SCSS, and `perfectionist` plus `padding-line-between-statements` autofix exactly
the things that would otherwise have to be kept by hand. It all runs under one
command — `bun run verify` (typecheck + ESLint + the client's import-cycle check + the UTF-8 check + Prettier + Stylelint).

## Sections

### Client (`apps/web/client`)

- [Slice structure](client/slices.md) — §1
- [Slice `ui/` and `ui-kit`](client/slice-ui.md) — §2, §2.1
- [`model/hooks` structure](client/model-hooks.md) — §2.2
- [Styles and SCSS](client/styles.md) — §3, §12
- [Component size](client/component-size.md) — §4
- [React conventions](client/react.md) — §10, §10.1, §10.2, §10.3, §10.4
- [The `model/`, `lib/` and `api/` segments](client/segments.md) — §11
- [Component body order](client/component-body.md) — §13.5
- [Forms](client/forms.md) — §15
- [Conditional render](client/conditional-render.md) — §16, §16.1
- [Drill cleanup](client/drill-cleanup.md) — §17

### Server (`apps/web/server`)

- [Server routes — NestJS](server/nestjs.md) — §18
- [Server modules](server/modules.md) — what each module owns
- [Queries: Prisma Client and Kysely](server/queries.md)
- [Data: schema, retention, concurrency](server/data.md)
- [The collector](server/collector.md)

### Shared (TypeScript everywhere)

- [Naming](shared/naming.md) — §5
- [Imports and barrels](shared/imports-and-barrels.md) — §6, §7
- [Types](shared/types.md) — §8, §8.1, §8.2
- [Arrow functions and braces](shared/functions.md) — §9, §9.1
- [Blank lines](shared/blank-lines.md) — §13
- [Readability](shared/readability.md) — one idea per line, small functions, names, readable tests
- [Shared schemas](shared/schemas.md) — §14
- [Forbidden](shared/forbidden.md) — §19
- [Checklist before a commit](shared/checklist.md) — §20

### Other guides

- [External documentation (context7 ids)](shared/references.md)
- Modpack (`apps/game/modpack`): [apps/game/modpack/CLAUDE.md](../../apps/game/modpack/CLAUDE.md) and [README](../../apps/game/modpack/README.md)
