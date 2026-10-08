export const MESSAGE_USAGE = {
  extensions: ['', '.ts', '.tsx', '/index.ts', '/index.tsx'],
  aliasPrefix: '@/',
  localesDir: 'shared/i18n/locales/ru',
  skippedSegment: '_tests',
  clientDirective: /^\s*['"]use client['"]/m,
  importPattern: /\b(?:import|export)([^'";]*)['"]([^'"]+)['"]/g,
  typeOnlyPattern: /^\s+type\s/,
  hookPattern: /useTranslations\(\s*['"`]([\w.]+)['"`]/g,
  namespacePropPattern: /namespace[=:]\s*(?:\{\s*)?['"`]([\w.]+)['"`]/g,
  errorKeyPattern: /ErrorKey\(\s*['"`](\w+)['"`]/g,
  keyLiteralPattern: /['"`]((\w+)\.[\w.]*\w)['"`]/g,
  declarationPattern: /withMessages\(\{\s*component:\s*\w+,\s*messages:\s*\[([^\]]*)\]/,
  quotedPattern: /['"]([\w.]+)['"]/g
} as const;
