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

export const REPLAY_ICONS = {
  viewBox: 24,
  paths: {
    play: ['M8 5v14l11-7z'],
    star: ['M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.3L12 17.4 6.4 20.4l1.1-6.3L3 9.7l6.2-.9z'],
    upload: ['M12 3l6 6h-4v6h-4V9H6z', 'M4 17h16v4H4z'],
    folder: ['M3 6h7l2 2h9v11H3z'],
    refresh: ['M12 4a8 8 0 0 1 7.4 5H22l-4 5-4-5h2.9A5 5 0 1 0 17 14h3.2A8 8 0 1 1 12 4z'],
    trash: ['M8 3h8v2h5v3H3V5h5z', 'M5 9h14l-1 12H6z'],
    pencil: ['M15 4l5 5-11 11H4v-5z'],
    hits: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', 'M10 10h4v4h-4z'],
    external: ['M14 3h7v7l-2.6-2.6-6 6-2.8-2.8 6-6z', 'M4 6h6v3H7v8h8v-3h3v6H4z'],
    close: ['M6.4 4L12 9.6 17.6 4 20 6.4 14.4 12 20 17.6 17.6 20 12 14.4 6.4 20 4 17.6 9.6 12 4 6.4z'],
    arrowDown: ['M10 4h4v10h4l-6 7-6-7h4z'],
    arrowUp: ['M10 20h4V10h4l-6-7-6 7h4z'],
    chevron: ['M6 9l6 6 6-6-2-2-4 4-4-4z'],
    search: ['M10 3a7 7 0 0 1 5.6 11.2l5.2 5.2-2.1 2.1-5.2-5.2A7 7 0 1 1 10 3zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z']
  }
} as const;
