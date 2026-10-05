import type { MOD_SHOWCASE, MOD_SHOWCASE_BASE } from '../../config';

export type ShowcaseGroup = (typeof MOD_SHOWCASE)[number];

export type ShowcaseItem = ShowcaseGroup['items'][number];

export type BaseComponentId = (typeof MOD_SHOWCASE_BASE)[number];
