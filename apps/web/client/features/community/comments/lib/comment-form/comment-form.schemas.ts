import * as z from 'zod';

import { zCreateComment } from '../../api';

export const commentFormSchema = z.object({
  body: z.string().trim().pipe(zCreateComment.shape.body)
});
