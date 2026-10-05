export const RETICLE_READOUTS = {
  states: ['reloading', 'final', 'ready', 'loaded', 'empty'],
  canvas: { width: 232, height: 128 },
  box: { width: 44, height: 22, offset: 48 },
  leader: 24,
  arcs: { radius: 30, span: 60, stroke: 2 },
  clipCell: { width: 6, height: 3 }
} as const;
