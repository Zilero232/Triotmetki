import { clamp } from 'remeda';

import type { GunArcData } from '../../model/schemas';
import type { ArcView } from './arc-view.types';

import { GUN_ARC } from '../../config';

const along = (share: number): number => Math.round(clamp(share, { min: 0, max: 1 }) * GUN_ARC.scale.width);

export const arcView = ({ position, centre }: Pick<GunArcData, 'centre' | 'position'>): ArcView => ({
  gun: along(position) - Math.floor(GUN_ARC.scale.dot / 2),
  centre: along(centre)
});
