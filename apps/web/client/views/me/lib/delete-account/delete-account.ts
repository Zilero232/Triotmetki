import * as z from 'zod';

export const deleteAccountFormSchema = (nickname: string) =>
  z.object({
    confirmation: z.string().refine((value) => nickname.length > 0 && value.trim() === nickname)
  });
