export const MARKS_REPORT = {
  chart: { width: 320, height: 90, minBar: 4, full: 100 },
  glyphs: { minus: '-', space: '\u00A0' },
  minSpan: 1,
  trendTones: { rising: 'good', falling: 'bad', flat: 'muted' },
  dash: '—',
  dateFormat: 'dd.MM HH:mm'
} as const;
