export const RICH_TEXT = {
  tag: /<(\/?)([a-z]+)((?:\s+[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/?>/gi,
  attribute: /([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
  entity: /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
  color: /^#[0-9a-f]{6}$/i,
  imageScheme: 'img://',
  newline: '\n',
  maxCodePoint: 1_114_111,
  surrogates: { first: 55_296, last: 57_343 },
  replacementCodePoint: 65_533,
  lineBreakTags: ['br'],
  styleTags: { b: { bold: true }, i: { italic: true }, u: { underline: true } },
  entities: { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' }
} as const;
