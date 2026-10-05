import type * as z from 'zod/mini';

import type { optionNoticeSchema } from './option-notice.schemas';

export type OptionNoticeData = z.infer<typeof optionNoticeSchema>;
