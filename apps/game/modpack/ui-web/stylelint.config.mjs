// Stylelint for the Gameface page: the repo rules plus what Coherent Gameface cannot render.
// Stylelint takes the nearest config, so this one extends the root and only adds.
//
// Sources, checked 2026-09 (the list in apps/game/modpack/README.md, «In-game UI → Gameface CSS»):
//   properties  https://docs.coherent-labs.com/cpp-gameface/content_development/supported_features_tables/cssproperties/
//   selectors   https://docs.coherent-labs.com/cpp-gameface/content_development/supported_features_tables/cssselectors/
//   media       https://docs.coherent-labs.com/cpp-gameface/content_development/mediaqueries/
//   SVG         https://docs.coherent-labs.com/cpp-gameface/content_development/supported_features_tables/svgsupport/
//   the client  https://github.com/wotstat/wot-src/tree/mt-ru/sources-gameface/_dist/production — Lesta's own
//               Gameface CSS: rem lengths, rgba() colours, no var(), calc(), gap or combinators.
// Those are the current Gameface docs; the game ships an older build, so this is a ceiling, not a floor.
export default {
  extends: ['../../../../stylelint.config.mjs'],
  rules: {
    // flex-flow is not supported (below), so flex-direction + flex-wrap stay longhands.
    'declaration-block-no-redundant-longhand-properties': [true, { ignoreShorthands: ['flex-flow'] }],
    // Flexbox is the only layout; everything listed here is blank (unsupported) in the property table.
    'property-disallowed-list': [
      [
        '/^grid/',
        'gap',
        'row-gap',
        'column-gap',
        '/^columns?(-|$)/',
        'flex-flow',
        'order',
        'float',
        'clear',
        '/^inset/',
        '/^(margin|padding|border)-(block|inline)/',
        '/^(max|min)-(block|inline)-size$/',
        'justify-items',
        'justify-self',
        '/^place-/',
        '/^outline/',
        '/^list-style/',
        'object-fit',
        'object-position',
        'will-change',
        'word-break',
        'word-spacing',
        'text-indent',
        'writing-mode',
        'direction',
        'unicode-bidi',
        '/^font-variant/',
        'font-kerning',
        'font-stretch',
        'border-collapse',
        'border-spacing',
        'table-layout',
        'caption-side',
        'empty-cells',
        'background-attachment',
        'background-blend-mode',
        'background-origin',
        'clip',
        'resize',
        'scroll-behavior',
        '/^touch-action/',
        'quotes',
        '/^counter-/',
        '/^container/',
        'tab-size'
      ],
      { message: (property) => `Gameface does not support "${property}"` }
    ],
    'declaration-property-value-allowed-list': [
      {
        display: ['flex', 'none'],
        position: ['relative', 'absolute', 'fixed'],
        'align-items': ['stretch', 'flex-start', 'flex-end', 'center'],
        'align-content': ['stretch', 'flex-start', 'flex-end', 'center'],
        'align-self': ['auto', 'stretch', 'flex-start', 'flex-end', 'center'],
        'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around'],
        'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap'],
        'text-overflow': ['clip', 'ellipsis'],
        '/^border(-(top|right|bottom|left))?-style$/': ['solid', 'none', 'hidden'],
        'text-decoration-style': ['solid'],
        content: ['none', 'normal', '/^["\'].*["\']$/'],
        // Native overflow scrolling ran backwards in the 1.45 client: a scroll box is overflow: hidden with a
        // script-driven wheel listener (shared/lib/wheel-scroll, the ui-kit ScrollArea).
        '/^overflow(-x|-y)?$/': ['hidden', 'visible']
      },
      { message: (property, value) => `Gameface does not support "${property}: ${value}"` }
    ],
    'declaration-property-value-disallowed-list': [
      {
        // Only solid borders are drawn.
        '/^border(-(top|right|bottom|left))?$/': ['/dashed/', '/dotted/', '/double/', '/groove/', '/ridge/', '/\\binset\\b/', '/\\boutset\\b/'],
        '/^(max-width|max-height)$/': ['none'],
        'user-select': ['all'],
        visibility: ['collapse']
      },
      { message: (property, value) => `Gameface does not support "${property}: ${value}"` }
    ],
    // Tokens are inlined at build time (design-tokens `token()`): custom property fallbacks and
    // var() inside @keyframes do not work, and calc() cannot mix % with lengths. Gradients are
    // linear and radial only; modern colour functions and math functions are missing.
    'function-disallowed-list': [
      [
        'var',
        'calc',
        'min',
        'max',
        'clamp',
        'env',
        'attr',
        'color-mix',
        'conic-gradient',
        'repeating-linear-gradient',
        'repeating-radial-gradient',
        'repeating-conic-gradient',
        'image-set',
        'hwb',
        'lab',
        'lch',
        'oklab',
        'oklch',
        'color'
      ],
      { message: (name) => `Gameface does not support ${name}()` }
    ],
    // «Limited color names» in the property table: colours are hex or rgb()/rgba().
    'color-named': 'never',
    'color-hex-alpha': 'never',
    // px is fine: postcss-pxtorem turns it into rem (1rem = 1px of the design) at build time.
    'unit-allowed-list': ['px', 'rem', 'em', '%', 'vw', 'vh', 's', 'ms', 'deg'],
    // Child, descendant and sibling combinators only match with EnableComplexCSSSelectorsStyling,
    // which the game does not promise: every element gets its own class instead.
    'selector-max-combinators': 0,
    'selector-max-compound-selectors': 1,
    // Nested rules would compile into descendant selectors, which the two rules above do not see.
    'max-nesting-depth': [0, { ignore: ['blockless-at-rules', 'pseudo-classes'] }],
    // Lists and selects render only through a polyfill, and radio, range and checkbox inputs are
    // missing (the page builds them from div + role; ESLint bans the JSX elements the same way).
    'selector-disallowed-list': [
      ['/(^|[^\\w-])(ul|ol|li|dl|dt|dd|select|option|optgroup|datalist)(?![\\w-])/', '/type=["\']?(radio|range|checkbox)/'],
      { message: (selector) => `Gameface has no native "${selector}": style the div-based replacement by its class` }
    ],
    'selector-pseudo-class-allowed-list': ['hover', 'active', 'focus', 'first-child', 'last-child', 'only-child', 'nth-child', 'root'],
    'selector-pseudo-element-allowed-list': ['before', 'after', 'selection'],
    'at-rule-disallowed-list': ['supports', 'container', 'layer', 'property', 'page', 'counter-style', 'font-feature-values', 'scope'],
    // Media Queries level 3 subset: size, aspect ratio and orientation of the view, prefix notation.
    'media-feature-name-allowed-list': [
      'width',
      'min-width',
      'max-width',
      'height',
      'min-height',
      'max-height',
      'aspect-ratio',
      'min-aspect-ratio',
      'max-aspect-ratio',
      'orientation'
    ],
    'media-feature-range-notation': 'prefix'
  }
};
