import * as z from 'zod/mini';

import { OPTION_NOTICE } from '../../config';

export const optionNoticeSchema = z.object({
  option: z.string(),
  state: z.string(),
  tone: z.enum(OPTION_NOTICE.tones)
});
