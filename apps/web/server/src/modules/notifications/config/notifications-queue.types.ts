import type { z } from 'zod';

import type { deliverPayloadSchema, digestPayloadSchema, digestSchema, notificationSchema } from './notifications-queue.schemas';

export type AppNotification = z.input<typeof notificationSchema>;
export type ParsedNotification = z.output<typeof notificationSchema>;
export type DeliverPayload = z.input<typeof deliverPayloadSchema>;
export type Digest = z.infer<typeof digestSchema>;
export type DigestPayload = z.infer<typeof digestPayloadSchema>;
