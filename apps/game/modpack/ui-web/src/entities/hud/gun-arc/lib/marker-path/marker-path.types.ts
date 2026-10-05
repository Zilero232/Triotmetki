import type { GUN_ARC } from '../../config';

export type LimitMarker = (typeof GUN_ARC.markers)[number];

export type CentreMarker = Exclude<(typeof GUN_ARC.centreMarkers)[number], 'none'>;

export type MarkerSide = 'left' | 'right';

export type MarkerPathInput = { shape: CentreMarker; side: 'centre' } | { shape: LimitMarker; side: MarkerSide };

export type MarkerPath = { d: string; filled: boolean };

export type Mirror = { x: (value: number) => number; sweep: 0 | 1 };
