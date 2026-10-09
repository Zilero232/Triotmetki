import { createApiKeySchema } from '@otmetki/schemas';
import * as z from 'zod';

import { KEY_EXPIRY } from '../../config';

export const createKeyFormSchema = createApiKeySchema.pick({ name: true }).extend({ expiry: z.enum(KEY_EXPIRY.options) });
