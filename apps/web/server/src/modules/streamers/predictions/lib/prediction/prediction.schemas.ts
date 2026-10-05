import { z } from 'zod';

export const predictionStateSchema = z.object({
  id: z.string().min(1),
  broadcasterId: z.string().min(1),
  yesId: z.string().min(1),
  noId: z.string().min(1),
  threshold: z.number().int().positive(),
  accountId: z.string().regex(/^\d+$/),
  tankId: z.number().int().positive(),
  openedAt: z.iso.datetime()
});

export const predictionJobSchema = z.object({
  accountId: z.string().regex(/^\d+$/),
  tankId: z.number().int().positive(),
  occurredAt: z.iso.datetime()
});
