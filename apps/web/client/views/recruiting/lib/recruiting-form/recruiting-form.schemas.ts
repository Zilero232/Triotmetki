import * as z from 'zod';

import { requirementsFormSchema } from '@/features/community/stat-requirements';

import { zCreateRecruiting } from '../../api';

export const recruitingFormSchema = z.object({
  accountId: z.string(),
  title: zCreateRecruiting.shape.title,
  body: zCreateRecruiting.shape.body,
  requirements: requirementsFormSchema,
  expiresInDays: z.string()
});
