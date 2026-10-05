import type { Standing, StandingInput } from './standing.types';

import { ACHIEVEMENTS_VIEW } from '../../config/view.constants';

export const standing = ({ above, total }: StandingInput): Standing => {
  if (total <= 0) {
    return { rank: null, topPercent: null };
  }

  const rank = Math.min(above + 1, total);

  return { rank, topPercent: (rank / total) * ACHIEVEMENTS_VIEW.percentScale };
};
