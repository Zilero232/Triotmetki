export const RETICLE_READOUTS = {
  states: ['reloading', 'final', 'ready', 'loaded', 'empty'],
  canvas: { width: 304, height: 128 },
  box: { width: 68, height: 28, padding: 8, offset: 48 },
  leader: 24,
  arcs: { radius: 30, span: 60, stroke: 2, sideDegrees: { left: 180, right: 0 } },
  clipCell: { width: 7, height: 4 },
  drum: {
    styles: ['shells', 'bars'],
    shells: ['ap', 'apcr', 'heat', 'he'],
    rowLimit: { shells: 10, bars: 12 },
    denseAbove: 6,
    shell: { full: { width: 8, height: 20 }, dense: { width: 6, height: 15 } }
  },
  zoom: { offset: 48 }
} as const;
