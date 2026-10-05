import type { z } from 'zod';

import type { catalogComponentSchema, catalogPresetSchema, catalogSchema, perfSchema } from './catalog.schemas';

export type Catalog = z.infer<typeof catalogSchema>;

export type CatalogComponent = z.infer<typeof catalogComponentSchema>;

export type CatalogPreset = z.infer<typeof catalogPresetSchema>;

export type Perf = z.infer<typeof perfSchema>;
