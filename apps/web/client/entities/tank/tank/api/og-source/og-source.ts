import { TANK_DETAIL } from '../../config';
import { getTank } from '../tanks';

export const tankOgSource = async (idOrSlug: string) => {
  'use cache';

  return getTank({ idOrSlug, period: TANK_DETAIL.period });
};
