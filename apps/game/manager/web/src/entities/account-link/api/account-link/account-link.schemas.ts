import { z } from 'zod';

const accountBindingSchema = z.object({
  accountId: z.number().int().positive(),
  deviceId: z.string(),
  boundAt: z.number().nullable()
});

export const accountLinkSchema = z.object({
  accounts: z.array(accountBindingSchema),
  selected: z.number().int().positive().nullable()
});
