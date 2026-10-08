import type { PlusFeature } from '@otmetki/schemas';

export type PlusTeaserFeature = Exclude<PlusFeature, 'analyticsExport' | 'apiLimits' | 'cosmetics' | 'overlays'>;
