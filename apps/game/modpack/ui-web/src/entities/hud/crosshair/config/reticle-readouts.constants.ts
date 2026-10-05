export const RETICLE_READOUTS = {
  states: ['reloading', 'final', 'ready', 'loaded', 'empty'],
  canvas: { width: 232, height: 128 },
  box: { width: 44, height: 22, offset: 48 },
  leader: 24,
  arcs: { radius: 30, span: 60, stroke: 2 },
  clipCell: { width: 6, height: 3 },
  drum: {
    styles: ['shells', 'bars'],
    shells: ['ap', 'apcr', 'heat', 'he'],
    rowLimit: { shells: 10, bars: 12 },
    denseAbove: 6,
    shell: { full: { width: 6, height: 15 }, dense: { width: 4, height: 10 } }
  },
  zoom: { offset: 48 }
} as const;
