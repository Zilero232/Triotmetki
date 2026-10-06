---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
---

<!-- Compressed editing rules, loaded automatically when a TS/JS file is edited. -->
<!-- The full guide is docs/guides/ (index: docs/guides/README.md); the root CLAUDE.md carries the key rules. Keep them in sync. -->

# Dependencies — reuse before writing

## Reuse over reinvention

Before writing a helper, check whether an installed library covers it:
`@siberiacancode/reactuse` (React hooks), `remeda` (arrays/objects), `ts-pattern`
(typed branching), `date-fns`, `zod`, `motion` (animation), `p-retry`,
`@base-ui/react` (unstyled primitives), `class-variance-authority` (variant maps),
`cmdk`, visx (charts), `@tanstack/react-table` + `@tanstack/react-virtual`,
`lucide-react` + `@otmetki/icons`, `sonner`, `@otmetki/logger` (pino). Within the
monorepo: `@otmetki/ratings` for any rating math, the server's `lib/lesta` for any
Lesta call, `@otmetki/schemas` or the client's generated `z*` schemas and request types
(`shared/api/generated`) for any contract — derive from them, never retype a field.

Only libraries **already declared** in the workspace's `package.json` count. A
transitive dependency used directly is a phantom dependency — it passes locally
through hoisting and fails on a clean CI install.

## The modpack's UI is not an exception

The modpack's pages (`apps/game/modpack/ui-web`) are HTML + React 19, so the same rule applies: a maintained library first — `remeda`, `ts-pattern`, `date-fns`, `zod/mini`, `nanostores` (through `@nanostores/react`), `@siberiacancode/reactuse`, `clsx` and whatever else fits. Gameface is a reason to *check* a library, not to skip it: build it with the page's ES target (`chrome94`), grep the output for built-ins newer than Chrome 94 (`structuredClone`, `findLast`, `toSorted`, `Object.groupBy`) and for `Intl`, and weigh the added size. Custom code stays only when that check fails, and then it gets an entry below with the measured reason.

## Kept on purpose

Custom code a library seems to cover but does not fit. Re-check an entry when the library changes, not when it looks duplicated:

- client `shared/lib/use-location-hash` — `useSyncExternalStore` with a `null` server snapshot, so markup keyed on the hash renders the same on the server and on the hydrating client. reactuse `useHash` reads `window.location.hash` in its `useState` initialiser (a hydration mismatch) and, in its default `replace` mode, writes the hash back on mount.
- client `features/app/pin-rows/lib/pinned-store` — one `useSyncExternalStore` store per pin scope, read once by the table hook with a `null` server snapshot (so `?pinned=true` shows a skeleton until the pins are read). reactuse `useLocalStorage` gives every caller its own state and a new `set` on each render, so cells could not share one read or get a stable toggle.
- client `shared/lib/stored-store` + `use-stored-store` — the same store generalised (compare selection, own nickname): one parse per raw value shared by every reader, schema-validated. reactuse `useLocalStorage` reads in its initialiser (a hydration mismatch) and keeps per-caller state.
- client `shared/lib/use-hydrated`, `shared/lib/use-client-now` — the same SSR-safe `useSyncExternalStore` shape; reactuse `useMount`/`useTime` would reintroduce the mismatch.
- client clock formatting (`shared/lib/duration-clock`) stays on date-fns — `Intl.DurationFormat` is missing from the `node:22` runtime image (Node 23+) and from the browsers above, and the clocks render on the server.
- modpack ui-web `shared/lib/rich-text` (`parseRichText`) — parses the panels' HTML subset `core/format/markup.py` emits into safe runs, never `innerHTML`, scanning with `String#matchAll`. Size is the reason: htmlparser2 costs ~22.5 KB gz (+65 % on hud.html); ultrahtml only tokenises, does not decode entities and auto-closes tags differently; `DOMParser` is not guaranteed in Gameface.
- modpack ui-web `isRecord` (remeda `isPlainObject` rejects engine-bound Gameface objects), `shared/lib/format-number` (Gameface has no `Intl`).
- modpack ui-web `shared/lib/smooth-scroll` — a 200 ms ease-out `scrollTop` tween on `requestAnimationFrame`. `motion`'s value `animate` is ~56 KB minified (+25 % on index.html) for the same tween, and CSS `scroll-behavior: smooth` does not act on a scroll box Gameface leaves `overflow: hidden`.
- modpack ui-web replay list (`widgets/replay/replays-browser` `use-virtual-list` + `lib/visible-range`) over `@tanstack/virtual-core` — the rows are fixed-height, so the window is ten lines of arithmetic; virtual-core is 24 KB minified / 7.2 KB gz and measures rows through `ResizeObserver`, which Cohtml is not known to have. Re-check when a long variable-height list appears.
- modpack ui-web `shared/lib/find-key` — one Ctrl+F check by key code (layout-independent); `tinykeys` needs `event.code` or a Latin `event.key` plus `getModifierState`, which Gameface's key events are not known to carry, while the client's own bundles read `keyCode`.
- modpack `core/client/timer` (`Ticker`) over the client's `helpers.CallbackDelayer` — CallbackDelayer lets a callback's exception escape and end the chain (core must log and keep ticking), pulls in `debug_utils` and `BigWorld.cancelCallback` bookkeeping the stubbed-client tests would have to fake, and gives no elapsed game time (`elapsed()` for countdowns).
- modpack `core/compat.keyword_options` — the Python 2 stand-in for keyword-only arguments (`**options` checked against a defaults dict, unknown names raise `TypeError`); the in-game Python 2.7 has no syntax for them and no package adds it.
- modpack `core/settings.Schema` and the lenient payload parsers (`core/me/parse.py`, `companion/payload`) over `schema` / voluptuous — ours null one bad field and keep the rest (the never-crash contract); both libraries reject the whole document on the first bad value, emulating ours takes an `Or(..., Use(lambda _: None))` per field, and voluptuous's current line needs Python 3.9+.
- modpack `core/net/backoff` (`backoff_delay`) over the `backoff` package — a pure, Retry-After-aware delay the outbox and the upload queue schedule on the game's ticker; `backoff`'s py2 releases are decorators and generators that retry with `time.sleep`.
