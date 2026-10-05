import { AUTHOR_SELECT } from '../../community-core';

export const BUILD_INCLUDE = { author: { select: AUTHOR_SELECT }, gameVersion: { select: { version: true } } } as const;
