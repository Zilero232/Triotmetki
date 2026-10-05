import { applyRequestSchema, settingsShareSchema } from '@otmetki/schemas';
import { z } from 'zod';

export const applyListSchema = z.array(applyRequestSchema);

export const settingsShareResponseSchema = z.object({ share: settingsShareSchema.nullable() });
