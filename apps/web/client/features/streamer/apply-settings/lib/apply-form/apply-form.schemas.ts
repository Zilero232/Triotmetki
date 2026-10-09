import { applicableGroupSchema } from '@otmetki/schemas';
import * as z from 'zod';

export const applyFormSchema = z.object({
  groups: z.array(applicableGroupSchema).min(1),
  includeResolution: z.boolean(),
  includeSensitivity: z.boolean()
});
