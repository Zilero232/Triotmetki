---
paths:
  - "apps/game/modpack/**/*.py"
---

<!-- Editing rules for the «Три отметки» modpack (Python), loaded automatically on edit. -->
<!-- Modpack specifics in apps/game/modpack/CLAUDE.md and README.md. Keep them in sync. -->

# Code style — modpack (Python): style

## Style

- Names: `snake_case` functions/modules, `PascalCase` classes, `UPPER_CASE` constants
  in a `constants.py` of the concern. Settings keys `snake_case`. An override of a client
  class keeps the client's names (`_onLoading`, `viewModel`, `doFormatting`).
- Constants: literals (numbers, strings, tuples, dicts, compiled regexes) live in the
  concern's `constants.py`. Host tooling (`tools/`) is the exception: a tool is a script
  run on the host, so it keeps its literals as `UPPER_CASE` names at the top of its own
  module, the way the repo's `scripts/*.mjs` do, and no `constants.py`. Two kinds stay
  beside their code: the package descriptor and public names (`FEATURE_ID`, `PACKAGE_ID`,
  `VERSION`, `STRINGS`, `SETTINGS`, `SCHEMA`, `GROUP`), and a table built from the module's own code (`FIELDS` of converters,
  `settings_share/fields.py`). Bus event names sent between packages
  are `core.events` constants; colours come from `core.format`.
- One public responsibility per module; functions small and pure where possible.
  Side effects (hooks, timers, network, disk) only in `client/` or core services.
- No comments explaining what code does; names do that. A `#` comment only says why a
  name or value is what it is: client provenance (`RU 1.45 client source`, `UNVERIFIED on
  Lesta 1.45`), fair play and what was left out, a Python 2 quirk; plus tool directives
  (`# noqa`, `# type:`). Docstrings only on core's public API and the app host
  interface (`companion/app/client`, `companion/settings_ui/client`). Tests have none
  (the test name says it). `tools/` is host tooling (on the same Python 2.7) and
  keeps its docstrings.
- Errors: never let an exception escape a game hook. Core wraps them: `hooks.subscribe`,
  `Subscriptions`, `BattleHooks` and `timer.Ticker` log a failing handler, `hooks.override`
  logs it and falls back to the original (an exception of the original itself propagates),
  `app.bus` logs and runs the next handler. `@safe` is only for what the client or a
  callback calls directly (transport and processor callbacks, Gameface commands, a method
  also called from code); `@guarded(context, fallback)` for a client read that may fail on
  API drift (it logs under `context` and returns a copy of `fallback`), never a hand-written
  `try/except/log_exception/return`. Features raise normally in `model`.
- Logging through `core.log` (`log`, `log_exception`, `safe`, `guarded`), which writes native `str`
  lines on both Pythons. `print` only inside `core.log` and in the entry scripts' last-resort
  `except` (the core itself may be what failed to import).
- A feature component starts from core, never from copies: `core.client.component.FeatureComponent`
  (strings, components.json section, `enabled()`, `enabled_in_hangar()`),
  `core.client.hud.panel.BattlePanel(app, PanelSpec)` (battle panels: preview, hooks, start/stop),
  `core.client.component.PolledHangarCard(app, CardSpec)` (hangar cards refreshed on a timer:
  implement only `render_card`), `FeatureComponent.refresh_action` (the «refresh» page button),
  `core.client.battle.on_own_shot` / `on_own_vehicle_effect` and the pure `core.shot_points`
  (own-vehicle hits), `core.net.signing.signed_request(transport, SignedRequest, callback)`,
  `core.client.me.signed_read(app, SignedRead, on_data)`,
  `core.client.native.NativeSettingsComponent`, `core.client.garage` (lock flags, item
  processors), `core.client.game` (`client_attr`, `service`, `values_by_name`,
  `selected_vehicle`, `lobby_app`), `core.errors.ReasonError`, `core.compat.clamp` / `fraction`
  (never a hand-written `max(low, min(high, value))`), `core.storage.write_bytes_atomic`.
- Strings shown to the player come from `i18n/` (ru and en in sync).
