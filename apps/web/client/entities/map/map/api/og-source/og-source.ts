import { getMap } from '../maps';

export const mapOgSource = async (idOrSlug: string) => {
  'use cache';

  return getMap({ idOrSlug });
};
