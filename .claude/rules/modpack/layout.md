---
paths:
  - "apps/game/modpack/**/*.py"
---

<!-- Editing rules for the «Три отметки» modpack (Python), loaded automatically on edit. -->
<!-- Modpack specifics in apps/game/modpack/CLAUDE.md and README.md. Keep them in sync. -->

# Code style — modpack (Python): layout

## Layout — folder per concern, nothing flat

```
packages/core/<concern>/        __init__.py + modules for one concern (events, hooks, settings, hud, net, storage, i18n, log)
packages/core/vendor/            vendored third-party libs (py2.7-compatible pins)
packages/companion/<concern>/    site companion logic (binding, battles, marks, outbox, settings_share)
packages/ui/                     in-game UI (Gameface settings window opened from ModsList, profiles, HUD edit); the app's window interface is companion/settings_ui
features/<id>/
  model/       pure logic, no client imports
  client/      game glue (BigWorld/gui hooks), thin
  settings/    schema + defaults
  i18n/        ru/en strings
  entry/       mod_otmetki_<id>.py loader stub
  tests/
tools/build/     packaging, components manifest (setupkit), compiler wrapper
catalog/         component catalogue (catalog.json, previews) the manager reads
```

- A concern with more than one file is a package (folder + `__init__.py`), never
  sibling modules `x.py`, `x_helpers.py`, `x_constants.py`.
- `model` never imports `BigWorld`, `gui.*`, `helpers.*` or anything from the client.
  `client` holds the only game imports and stays thin.
- A feature talks to core only through its public `__init__` (registry, events,
  settings, hud); never reach into another feature.
