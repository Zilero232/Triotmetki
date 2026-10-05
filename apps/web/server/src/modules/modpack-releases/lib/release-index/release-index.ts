import type { ModpackReleaseIndex } from '@otmetki/schemas';

import { modpackReleaseIndexSchema } from '@otmetki/schemas';

import { MODPACK_RELEASES_SOURCE } from '../../config/modpack-releases.constants';

export const parseReleaseIndex = (text: string): ModpackReleaseIndex =>
  modpackReleaseIndexSchema.parse(text.trim() === '' ? MODPACK_RELEASES_SOURCE.emptyIndex : JSON.parse(text));
