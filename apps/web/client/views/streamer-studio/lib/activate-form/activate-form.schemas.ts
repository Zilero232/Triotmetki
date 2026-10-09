import { activateChallengeSchema } from '@otmetki/schemas';
import * as z from 'zod';

export const activateFormSchema = z.object({
  donorName: z
    .string()
    .trim()
    .pipe(z.union([z.literal(''), activateChallengeSchema.shape.donorName.unwrap()]))
    .transform((donorName) => (donorName === '' ? undefined : donorName))
});
