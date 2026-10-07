# @otmetki/design-tokens

Three Marks' design tokens, framework-agnostic: SCSS maps and a few mixins, one partial per concern. The web client emits them as CSS variables; the modpack's Gameface window inlines their static values at build time.

```scss
@use '@otmetki/design-tokens' as tokens;

:root {
  @include tokens.root-properties;
}

:root,
[data-theme='dark'] {
  @include tokens.theme-properties(dark);
}

.card {
  color: tokens.token(color-accent); // static value, dark theme by default
}
```

## Layout

| File                    | What                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scss/_colors.scss`     | `$dark` / `$light` colour maps (surfaces, text, accent, game colours per theme) and the chart aliases                                                                                      |
| `scss/_scale.scss`      | `$typography`, `$spacing`, `$radii`                                                                                                                                                        |
| `scss/_motion.scss`     | `$motion` (durations, easing) and `@mixin reduced-motion`                                                                                                                                  |
| `scss/_palette.scss`    | Theme-independent colours: shades, nations, classes, tiers, equipment, icon and rating-tier aliases                                                                                        |
| `scss/_surfaces.scss`   | Elevation, sheen, glow and panel tokens per theme                                                                                                                                          |
| `scss/_textures.scss`   | Rating patterns, SVG textures per theme and `@mixin texture($kind)`                                                                                                                        |
| `scss/_hud.scss`        | The in-game HUD's tones, plates and type steps (`hud-*` tokens, px) and `@mixin hud-type($step)`                                                                                           |
| `scss/_window.scss`     | The in-game settings window: `win-*` surfaces, controls and preview stage, and `$window-palette`, the RU 1.45 client colours its Gameface pages use in place of the site's `color-*` roles |
| `scss/_ratings.scss`    | The default rating colours and the `xvm` / `wotlife` palettes                                                                                                                              |
| `scss/_properties.scss` | The merged `$root` / `$themes`, `token($name, $theme)` and the `*-properties` mixins                                                                                                       |
| `_index.scss`           | Public surface (`@use '@otmetki/design-tokens'`)                                                                                                                                           |
| `src/`                  | `readDesignTokens()`: compiles the maps with sass-embedded and returns their CSS text, for Node consumers                                                                                  |

## Rules

- A value is CSS text. Hex colours and plain numbers stay unquoted; anything Sass would rewrite (`rgb(r g b / a)`, shadows, gradients with `rgb()`, data URIs) is a quoted string, emitted verbatim, so the site's CSS is byte-for-byte what it was before the move.
- A colour token goes into both `$dark` and `$light` in the same change.
- The data URIs spell the inner `url(` as `url#{"("}`: Vite rebases every `url(` it finds in an imported Sass file and would otherwise break `filter='url(%23n)'`.
- Consumers: the web client (`apps/web/client/shared/styles/_tokens.scss`, load path `node_modules`) and the modpack's `ui-web` (Vite resolves the `sass` export condition). Site-only layout tokens (shell, header, rows, z-index, safe areas, font stacks) stay in the client.

Tests: `scss/_tests` and `src/**/_tests`, run from the repo root with `bun run test`.
