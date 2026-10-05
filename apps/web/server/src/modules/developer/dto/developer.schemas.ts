import { uuidSchema } from '@otmetki/schemas';
import { z } from 'zod';

import { WEBHOOK_DB_EVENTS } from '../config/webhook-events.constants';

export const developerIdParamsSchema = z.object({ id: uuidSchema });

export const webhookDbEventSchema = z.enum(WEBHOOK_DB_EVENTS);
