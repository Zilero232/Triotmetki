export const REPLAYS_BROWSER = {
  rowHeight: 68,
  overscan: 6,
  fallbackViewport: 480,
  searchMaxLength: 60,
  renameMaxLength: 100,
  progressScale: 100,
  winRateDigits: 0,
  templateToken: /\{(\w+)\}/g,
  separators: { name: ', ', meta: ' · ', accuracy: ' / ' },
  uploadHints: { ready: null, off: 'uploadOff', unbound: 'uploadUnbound', missing: 'uploadMissing' },
  statusTexts: {
    empty: 'empty',
    indexing: 'indexing',
    invalid: 'invalid',
    list: 'empty',
    no_account: 'noAccount',
    nothing: 'nothingFound',
    off: 'offHint'
  }
} as const;
