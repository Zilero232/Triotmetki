import { getGuide } from '../guides';

export const guideOgSource = async (slug: string) => {
  'use cache';

  return getGuide({ slug });
};
