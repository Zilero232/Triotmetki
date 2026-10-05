---
paths:
  - "apps/game/modpack/**/*.py"
---

<!-- Editing rules for the «Три отметки» modpack (Python), loaded automatically on edit. -->
<!-- Modpack specifics in apps/game/modpack/CLAUDE.md and README.md. Keep them in sync. -->

# Code style — modpack (Python): Python 2.7

## Runtime

The game client runs **Python 2.7.18** (BigWorld). Packages ship as compiled `.pyc`
inside `.mtmod` archives under `mods/<version>/`. The tests and all of the host tooling
run on the same 2.7.18 (mise `conda:python`, packages in `tools/requirements.txt`);
there is no Python 3 in the modpack.

## Python 2.7 rules

- `from __future__ import absolute_import, division, print_function, unicode_literals` in every
  module of `packages/` and `features/`, tests included. A literal a Python 2 C API needs as
  `str` goes through `str('...')` or `core.compat.to_native` (struct formats, `type()` names,
  `BigWorld.fetchURL` arguments). `tools/` uses the same imports, except the cross-package
  `tools/tests` and `tools/testing/_feedback.py`, which build client stubs from native `str` names.
- Text vs bytes through `six` (`six.text_type`, `six.ensure_text`); no f-strings, no
  `nonlocal`, no keyword-only args, no `async`, no walrus, no type annotations —
  use `# type:` comments.
- Classes inherit `object`. `super(Cls, self)`.
- The 2.7 compiler is the syntax check (`tools/tests/test_py27_compat.py` compiles every
  source); ruff (standalone binary, `ruff.toml`) targets py37 with pyupgrade off.
- Mind what Python 2 does differently: `round()` rounds half away from zero, `/` needs the
  `division` import, `str()` of text is bytes, `os.environ` and `sys.argv` are bytes,
  `open()` has no `encoding` (use `io.open`), no `exist_ok`, no `os.replace`.
