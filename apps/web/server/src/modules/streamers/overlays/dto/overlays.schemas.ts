import { overlayPublicIdSchema } from '@otmetki/schemas';
import { z } from 'zod';

export const overlayParamsSchema = z.object({
  publicId: overlayPublicIdSchema
});
