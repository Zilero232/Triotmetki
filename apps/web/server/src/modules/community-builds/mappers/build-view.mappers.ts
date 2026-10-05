import { loadoutSchema } from '@otmetki/schemas';

import type { BuildView } from '../community-builds.types';
import type { ToBuildViewInput } from './build-view.types';

import { toAuthorView } from '../../community-core';
import { EMPTY_LOADOUT } from '../config/loadout.constants';
import { buildStatsSchema } from '../dto/community-builds.schemas';

export const toBuildView = ({ build, author, likedByMe, gameVersion }: ToBuildViewInput): BuildView => {
  const loadout = loadoutSchema.safeParse(build.loadout);
  const stats = buildStatsSchema.safeParse(build.stats);

  return {
    id: build.id,
    tankId: build.tankId,
    title: build.title,
    description: build.description,
    loadout: loadout.success ? loadout.data : EMPTY_LOADOUT,
    stats: stats.success ? stats.data : null,
    author: toAuthorView(author),
    visibility: build.visibility,
    likesCount: build.likesCount,
    likedByMe,
    gameVersion,
    createdAt: build.createdAt.toISOString(),
    updatedAt: build.updatedAt.toISOString()
  };
};
