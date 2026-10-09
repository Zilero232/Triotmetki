import * as z from 'zod';

export const magicLinkFormSchema = z.object({
  email: z.email()
});
