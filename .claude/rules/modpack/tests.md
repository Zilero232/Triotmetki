---
paths:
  - "apps/game/modpack/**/*.py"
  - "apps/game/modpack/**/tests/**"
---

<!-- Editing rules for the «Три отметки» modpack (Python), loaded automatically on edit. -->
<!-- Modpack specifics in apps/game/modpack/CLAUDE.md and README.md. Keep them in sync. -->

# Code style — modpack (Python): tests

## Tests

`features/<id>/tests` and `packages/*/tests` (unittest classes, plain asserts) run by the
stdlib runner `tools/run_tests.py` on Python 2.7, the client's version. Pure logic fully
tested; client glue covered by the stubbed-client smoke test, including random load order.
A test that drops modules goes through `_support.forget_modules` / `drop_modules`, and a
stub of a dotted client module through `_support.stub_parents` (Python 2 import rules).
Commands: `bun run test:modpack`, `ruff check .` (in `apps/game/modpack`).

## Where they live and how they run

The one exception is the game modpack: Python `unittest` suites in a `tests/` folder of each package (`apps/game/modpack/packages/*/tests`, `apps/game/modpack/features/*/tests`, `apps/game/modpack/tools/**/tests`), because the build packs the source folders into `.mtmod` packages and leaves `tests/` out.

The modpack — `bun run test:modpack` (`python apps/game/modpack/tools/run_tests.py`: every suite, game code and tooling, on Python 2.7.18 with the packages of `tools/requirements.txt`).
