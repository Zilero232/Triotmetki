import { clamp } from 'remeda';

import { polarPoint, RADIAL } from '@/shared/lib/radial';

import type { ArcPathInput, ArcsView, ArcsViewInput, ArcView, ArcViewInput } from './reticle-arcs.types';

import { RETICLE_READOUTS } from '../../config';

export const arcPath = ({ side, progress, centre }: ArcPathInput): string | null => {
  const filled = clamp(progress, { min: 0, max: 1 });

  if (filled <= 0) {
    return null;
  }

  const { radius, span, sideDegrees } = RETICLE_READOUTS.arcs;
  const isLeft = side === 'left';
  const bottom = isLeft ? sideDegrees.left - span / 2 : sideDegrees.right + span / 2;
  const sweep = isLeft ? 1 : 0;
  const end = isLeft ? bottom + span * filled : bottom - span * filled;
  const from = polarPoint({ centre, radius, degrees: bottom });
  const to = polarPoint({ centre, radius, degrees: end });

  return `M${from}A${radius} ${radius} 0 0 ${sweep} ${to}`;
};

const arcView = ({ side, progress, centre }: ArcViewInput): ArcView => {
  const d = progress === null ? null : arcPath({ side, progress, centre });

  return { d: d ?? RADIAL.emptyPath, isShown: d !== null };
};

export const arcsView = ({ arcs, centre }: ArcsViewInput): ArcsView => ({
  isIdle: arcs === null,
  leftTrack: arcView({ side: 'left', progress: 1, centre }).d,
  rightTrack: arcView({ side: 'right', progress: 1, centre }).d,
  reload: arcView({ side: 'left', progress: arcs?.reload ?? null, centre }),
  health: arcView({ side: 'right', progress: arcs?.health ?? null, centre })
});
