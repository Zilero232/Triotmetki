import type { ModpackReleaseIndex } from '@otmetki/schemas';

export type CachedReleaseIndex = {
  index: ModpackReleaseIndex;
  loadedAt: number;
};
