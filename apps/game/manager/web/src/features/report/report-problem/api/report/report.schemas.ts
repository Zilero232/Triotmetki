import { z } from 'zod';

import { REPORT } from '../../config';

export const reportPartSchema = z.enum(REPORT.parts);

const reportItemSchema = z.object({
  part: reportPartSchema,
  name: z.string(),
  bytes: z.number().int().nonnegative(),
  truncated: z.boolean(),
  redactions: z.number().int().nonnegative(),
  text: z.string()
});

export const reportPreviewSchema = z.object({
  id: z.string(),
  managerVersion: z.string(),
  modpackVersion: z.string().nullable(),
  gameVersion: z.string().nullable(),
  items: z.array(reportItemSchema)
});

export const reportReceiptSchema = z.object({
  id: z.string(),
  expiresAt: z.string()
});
