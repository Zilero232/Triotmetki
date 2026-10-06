export const RETICLE_SHELLS = {
  sprite: { file: 'shells.png', scale: 4, kinds: ['ap', 'apcr', 'heat', 'he'], paints: ['loaded', 'gold', 'spent', 'refill'] },
  viewBox: { width: 8, height: 20 },
  outlineWidth: 0.9,
  case: 'M1 10h6v8.5H1z',
  rim: 'M0.5 18.5h7V20h-7z',
  noses: {
    ap: 'M1 10C1 6 2.6 2.6 4 1C5.4 2.6 7 6 7 10z',
    apcr: 'M1 10L2.6 8V4.5L4 1L5.4 4.5V8L7 10z',
    heat: 'M1 10L2.4 5.5H3.4V1.5H4.6V5.5H5.6L7 10z',
    he: 'M1 10C1 7 2.3 5 4 5C5.7 5 7 7 7 10z'
  },
  paint: {
    loaded: { fill: '#f4f1ea', stroke: '#0e0e10' },
    gold: { fill: '#e8b84a', stroke: '#0e0e10' },
    spent: { fill: '#0a0a0c', stroke: '#f4f1ea', fillOpacity: 0.55, strokeOpacity: 0.35 },
    refill: { fill: '#ff8a2a', stroke: '#0e0e10' }
  }
} as const;
