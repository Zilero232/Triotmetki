import type { BaseComponentId } from './showcase.types';

import { MOD_SHOWCASE, MOD_SHOWCASE_BASE } from '../../config';

const SHOWCASE_IDS = new Set<string>(MOD_SHOWCASE.flatMap((group) => group.items.map((item) => item.id)));

const BASE_IDS = new Set<string>(MOD_SHOWCASE_BASE);

export const showcaseCount = (): number => SHOWCASE_IDS.size;

export const isBaseId = (id: string): id is BaseComponentId => BASE_IDS.has(id);
