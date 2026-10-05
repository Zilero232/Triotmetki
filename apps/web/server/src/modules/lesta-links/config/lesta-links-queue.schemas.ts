import { z } from 'zod';

import { LESTA_LINKS_QUEUE } from './lesta-links-queue.constants';

export const garageDispatchPayloadSchema = z.object({
  scope: z.enum(LESTA_LINKS_QUEUE.scopes).default('pending')
});

export const garagePayloadSchema = z.object({
  accountId: z.number().int().positive()
});
