# @otmetki/icons

The Три отметки SVG icon set as React components: vehicle classes, nations, tiers, marks of excellence, mastery badges, crew roles, equipment categories, game modes and the logo. Stroke-matched to `lucide-react`, so the two sets sit side by side in one UI. Used by the site and the manager; the modpack's Gameface UI reads the framework-free geometry from `@otmetki/icons/shapes`.

## Usage

```tsx
import { MarkOfExcellenceIcon, TierIcon } from '@otmetki/icons';

<TierIcon tier={10} size={16} />
<MarkOfExcellenceIcon marks={3} />
```

## Layout

| `src/` folder | What                                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icons/`      | Static icons, one folder per group (`classes`, `nations`, `tier`, `marks`, `mastery`, `crew-roles`, `modes`, …)                                                  |
| `animated/`   | `motion`-driven variants: logo, crosshair, mark of excellence, mastery                                                                                           |
| `lib/`        | `createIcon`, `IconBase`, stroke resolution, roman numerals, star and tier glyph paths                                                                           |
| `registry/`   | Lookup maps (`NATION_ICONS`, `TANK_CLASS_ICONS`, `ICON_GROUPS`)                                                                                                  |
| `shapes/`     | `@otmetki/icons/shapes`: framework-free geometry (`LOGO_SHAPES`, `ICON_DEFAULTS`) for non-React renderers — the modpack's Gameface sprite and its build-time PNG |

## Testing

Tests live in `src/**/_tests` (jsdom); run them from the repo root with `bun run test`.

## Reference

### Game conventions

- Vehicle classes follow the community shapes: light = solid rhombus, medium = rhombus split by one `\` gap, heavy = rhombus split into three bars, TD = downward triangle, SPG = square. `variant` is `regular` (current colour), `premium` (gold fill with an orange glow) or `elite` (our own laurel wreath). The old side-view drawings live on as `*SilhouetteIcon` for decorative backdrops.
- Nations are our own flag-inspired drawings, not the in-game flags: `palette='color'` for full colour, `mono` (default) for `currentColor`. `NationFlag` is the frameless 10:7 field used as a blurred backdrop behind tank renders.
- `MasteryIcon tinted` paints bronze / silver / gold; `MarkOfExcellenceIcon markStyle='rings'` swaps the stars for barrel rings; `TierIcon engraved` sets the numeral on a riveted plate.
- Colours come from CSS variables with fallbacks (`--otmetki-class-premium`, `--otmetki-class-elite`, `--otmetki-mastery-*`), so the client themes them through its tokens.

### Rules

- Props mirror lucide's: `size`, `strokeWidth`, `absoluteStrokeWidth`, plus any SVG attribute and an optional `title`.
- `react` and `motion` are peer dependencies; the client transpiles the package (`transpilePackages` in its Next config).
- A new icon goes through `createIcon` so it inherits the defaults, and into `registry/registry.ts` if the UI looks it up by key.
