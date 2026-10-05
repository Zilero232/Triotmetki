import type * as z from 'zod/mini';

import type { marksPanelSchema } from './marks-panel.schemas';

export type MarksPanelData = z.infer<typeof marksPanelSchema>;
