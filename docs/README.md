# Documentation index

Everything under `docs/`, grouped by concern. Agent-facing editing digests live separately in [.claude/rules/](../.claude/rules/) (loaded by path) and in the `CLAUDE.md` files.

## Product

- [product/features.md](product/features.md) — the feature catalogue: priorities, sources, what is done.

## Specs

Design specs, one per initiative, dated.

- [specs/2026-09-24-otmetki-design.md](specs/2026-09-24-otmetki-design.md) — the platform design (architecture, data flow, phases).
- [specs/2026-09-26-plus-subscription.md](specs/2026-09-26-plus-subscription.md) — the Plus subscription.
- [specs/2026-09-26-streamer-settings.md](specs/2026-09-26-streamer-settings.md) — the streamer directory and streamer settings.
- [specs/2026-09-28-plus-free-tiers.md](specs/2026-09-28-plus-free-tiers.md) — free tiers and monthly meters for Plus features (3D armor, battle analysis), the before/after feature matrix.
- [specs/2026-09-28-manager-runtime-dependencies.md](specs/2026-09-28-manager-runtime-dependencies.md) — the manager installs OpenWG Gameface and GUIFlash as pinned runtime dependencies; the catalogue entries requested from the modpack owner.
- [specs/2026-09-29-derived-data-rules.md](specs/2026-09-29-derived-data-rules.md) — the rules behind automatic replay tags, tank × map win rates and the fine mark curve, and where each hides thin data.
- [specs/2026-09-29-hud-visual-redesign.md](specs/2026-09-29-hud-visual-redesign.md) — the modpack HUD look: client icons, panel placement, which stock elements each panel replaces.
- [specs/2026-09-30-hud-consolidation-and-design.md](specs/2026-09-30-hud-consolidation-and-design.md) — merging the duplicate modpack components (47 → 32), defaults and default values, the settings migration, and the HUD design system (plate, type, spacing, tones) with a spec per block.
- [specs/2026-10-05-server-refactor.md](specs/2026-10-05-server-refactor.md) — the server refactor plan: one way to write queries, simpler structure, the bug and inconsistency items it found.

## Architecture

- [architecture/fsd.md](architecture/fsd.md) — Feature-Sliced Design as used by `apps/web/client`: layers, slices, segments, where a thing goes.

## Guides

The style guide, split by stack. Index and tooling: [guides/README.md](guides/README.md).

- `guides/client/` — slices, `ui/` and `ui-kit`, `model/hooks`, segments, React, component body and size, styles, forms, conditional render, drill cleanup.
- `guides/server/` — [NestJS modules and routes](guides/server/nestjs.md).
- `guides/shared/` — naming, imports and barrels, types, functions, blank lines, shared schemas, forbidden list, pre-commit checklist, [external docs (context7 ids)](guides/shared/references.md).
- Modpack — [apps/game/modpack/CLAUDE.md](../apps/game/modpack/CLAUDE.md) and [apps/game/modpack/README.md](../apps/game/modpack/README.md); the component catalogue the manager and МОСТ read — [apps/game/modpack/catalog/README.md](../apps/game/modpack/catalog/README.md).
- Modpack manager (Tauri 2 app, the way players install the modpack) — [apps/game/manager/CLAUDE.md](../apps/game/manager/CLAUDE.md) and [apps/game/manager/README.md](../apps/game/manager/README.md): client detection, state layout, patch flow, the `/modpack/releases/latest` and updater feeds, `triotmetki://` deep links.

## Research

- `research/client/` — [client 1.45 hooks and events](research/client/2026-09-29-client-1.45-hooks.md) the modpack uses, checked against the RU sources; [battle overlays](research/client/2026-10-05-battle-overlays.md): every stock overlay over the battle view, its client signal and whether our panels give way.
- `research/data/` — [Lesta API reference and terms](research/data/lesta-api.md), [ЛБЗ in the client files](research/data/lbz.md), [3D armor viewer](research/data/armor-viewer.md), [modpack fair-play audit 2026-10-05](research/data/2026-10-05-fair-play-audit.md).
- `research/design/` — [visual language](research/design/visual-language.md), [design v2](research/design/design-v2.md), [v3](research/design/design-v3.md), [v4](research/design/design-v4.md), [competitor UI and the in-game design language](research/design/2026-10-03-competitor-ui.md).
- `research/competitors/` — [market](research/competitors/market.md), [competitors v2](research/competitors/competitors-v2.md), [sites gap analysis](research/competitors/2026-09-29-sites-gap-analysis.md), [modpacks round 3](research/competitors/2026-09-29-modpacks-round3.md), [round 4](research/competitors/2026-09-30-round4.md), [replay managers](research/competitors/2026-09-30-replays.md), [modpacks code study](research/competitors/2026-09-30-modpacks-code.md), [stock elements we replace](research/competitors/2026-10-05-stock-replacement.md), [behaviour parity with the established packs](research/competitors/2026-10-05-behavior-parity.md), [modpacks source-level deep dive](research/competitors/2026-10-05-modpacks-deep-dive.md).
- `research/tooling/` — [ready-made packages](research/tooling/packages.md), [modpack UI packages](research/tooling/2026-09-30-modpack-ui-packages.md) (Gameface engine V8 9.4, what replaces custom ui-web code), [modpack library audit](research/tooling/2026-09-30-library-audit.md) (ui-web and Python).

## Ops

- [ops/deploy.md](ops/deploy.md) — the first production deploy checklist, modpack and manager releases on the VPS.
- [ops/moe-thresholds.md](ops/moe-thresholds.md) — where the MoE thresholds come from, how to check and trigger the fill in production.
- [ops/most-publishing.md](ops/most-publishing.md) — publishing the modpack in МОСТ.
- [ops/mod-authors-outreach.md](ops/mod-authors-outreach.md) — asking mod authors for permission to ship their assets.

## Licensing

- [LICENSE](../LICENSE) — the repository is proprietary; [packages/sdk/LICENSE](../packages/sdk/LICENSE) — the public API client is MIT.
- [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) — third-party works that ship with the site, the modpack and the manager.
