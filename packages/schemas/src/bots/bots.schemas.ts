import * as z from 'zod';

export const discordStatusSchema = z.object({
  enabled: z.boolean(),
  linkEnabled: z.boolean(),
  inviteUrl: z.url().nullable()
});

export const vkStatusSchema = z.object({
  enabled: z.boolean(),
  linkEnabled: z.boolean(),
  botUrl: z.url().nullable(),
  miniAppUrl: z.url().nullable()
});
