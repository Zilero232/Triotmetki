import * as z from 'zod';

export const playerLookupFormSchema = z.object({
  player: z.string()
});
