import type { CentreMarker, LimitMarker, MarkerPath, MarkerPathInput, MarkerSide, Mirror } from './marker-path.types';

import { GUN_ARC } from '../../config';

const OCTAGON = 'M7.5 10H12.5L16 13.5V18.5L12.5 22H7.5L4 18.5V13.5Z';

const LIMIT_PATHS: Record<LimitMarker, (mirror: Mirror) => string> = {
  corner: ({ x }) => `M${x(14)} 8L${x(6)} 16L${x(14)} 24`,
  brackets: ({ x }) => `M${x(14)} 4H${x(7)}V28H${x(14)}`,
  big_semicircle: ({ x, sweep }) => `M${x(16)} 3A13 13 0 0 ${sweep} ${x(16)} 29`,
  semicircle: ({ x, sweep }) => `M${x(14)} 9A7 7 0 0 ${sweep} ${x(14)} 23`,
  octagon: () => OCTAGON
};

const CENTRE_PATHS: Record<CentreMarker, MarkerPath> = {
  line: { d: 'M10 6V26', filled: false },
  dot: { d: 'M7 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0z', filled: true },
  triangle: { d: 'M10 12L14 20H6Z', filled: true },
  octagon: { d: OCTAGON, filled: false }
};

const mirrorOf = (side: MarkerSide): Mirror =>
  side === 'left' ? { x: (value) => value, sweep: 0 } : { x: (value) => GUN_ARC.box.width - value, sweep: 1 };

export const markerPath = (input: MarkerPathInput): MarkerPath =>
  input.side === 'centre' ? CENTRE_PATHS[input.shape] : { d: LIMIT_PATHS[input.shape](mirrorOf(input.side)), filled: false };
