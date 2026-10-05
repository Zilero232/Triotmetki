import type { z } from 'zod';

import type { garageDispatchPayloadSchema, garagePayloadSchema } from './lesta-links-queue.schemas';

type GarageDispatchPayload = z.infer<typeof garageDispatchPayloadSchema>;

export type GaragePayload = z.infer<typeof garagePayloadSchema>;
export type GarageScope = GarageDispatchPayload['scope'];
