import { plusLimit } from '@otmetki/schemas';
import { sortBy } from 'remeda';

import type { PausedOverlaysInput } from './overlay-pause.types';

export const pausedOverlayIds = ({ overlays, isPlus }: PausedOverlaysInput): Set<string> => {
  const ordered = sortBy(overlays, [(overlay) => overlay.createdAt.getTime(), 'asc'], [(overlay) => overlay.id, 'asc']);

  return new Set(ordered.slice(plusLimit({ key: 'overlays', isPlus })).map((overlay) => overlay.id));
};
