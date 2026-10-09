import * as z from 'zod';

import { zCreateOrder } from '@/entities/coaching/coach';

export const requestFormSchema = z.object({
  offerId: z.string(),
  replayId: z.string().refine((value) => value.trim() === '' || zCreateOrder.shape.replayId.safeParse(value.trim()).success),
  notes: zCreateOrder.shape.notes.unwrap(),
  studentContact: z.string().refine((value) => zCreateOrder.shape.studentContact.safeParse(value.trim()).success)
});
