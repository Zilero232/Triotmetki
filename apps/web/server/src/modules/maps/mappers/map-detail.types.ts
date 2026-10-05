import type { MapStats } from '@otmetki/schemas';

import type { Arena } from '../../../../generated';

export type ArenaRow = Pick<
  Arena,
  'arenaId' | 'camouflageType' | 'data' | 'description' | 'descriptionEn' | 'image' | 'modes' | 'name' | 'nameEn' | 'sizeMeters' | 'slug'
>;

export type MinimapUrlInput = {
  image: string | null;
  path: string | null | undefined;
};

export type ToMapDetailInput = {
  arena: ArenaRow;
  stats: MapStats | null;
};

export type ToMapRefInput = {
  arena: Pick<ArenaRow, 'arenaId' | 'image' | 'name' | 'nameEn' | 'slug'> | null;
  arenaId: string;
};
