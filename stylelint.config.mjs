import { stylelint } from '@siberiacancode/stylelint';

export default {
  ...stylelint,
  ignoreFiles: ['**/node_modules/**', '**/.next/**', '**/.next-*/**', '**/dist/**', '**/out/**', '**/coverage/**'],
  rules: {
    ...stylelint.rules,

    // Prettier owns blank lines. Stylelint inserts one before a nested rule,
    // prettier strips it again, and the two never converge — lint:css and
    // format:check could not both pass until this yielded.
    'rule-empty-line-before': null,

    // CSS-Modules syntax the shared config does not know about.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],

    // Names here are camelCase because they are read as `s.srOnly` from TSX;
    // the shared config asks for snake_case.
    'keyframes-name-pattern': null,
    'scss/at-mixin-pattern': null,
    'selector-class-pattern': null
  },
  overrides: [
    {
      // The toaster overrides Sonner's inline styles, which nothing else can do.
      files: ['apps/web/client/app/globals.scss'],
      rules: {
        'declaration-no-important': null
      }
    }
  ]
};
