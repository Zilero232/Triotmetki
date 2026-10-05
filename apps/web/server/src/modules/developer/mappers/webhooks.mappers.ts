import type { WebhookDelivery, WebhookEndpoint, WebhookEvent } from '@otmetki/schemas';

import type { NotificationEvent } from '../../../../generated';
import type { DeliveryRow, EndpointRow } from './webhooks.types';

import { toIso } from '../../../common/lib';
import { WEBHOOK_EVENT_FROM_DB } from '../config/webhook-events.constants';
import { webhookDbEventSchema } from '../dto/developer.schemas';
import { readWebhookFilter } from '../lib/webhook-match/webhook-match';

export const webhookEventFromDb = (event: NotificationEvent): WebhookEvent | null => {
  const parsed = webhookDbEventSchema.safeParse(event);

  return parsed.success ? WEBHOOK_EVENT_FROM_DB[parsed.data] : null;
};

export const toWebhookEndpoint = (row: EndpointRow): WebhookEndpoint => {
  const filter = readWebhookFilter(row.filter);

  return {
    id: row.id,
    url: row.url,
    events: row.events.flatMap((event) => webhookEventFromDb(event) ?? []),
    filter: { accountIds: filter.accountIds, clanIds: filter.clanIds },
    isActive: row.isActive,
    failureCount: row.failureCount,
    disabledAt: toIso(row.disabledAt),
    createdAt: row.createdAt.toISOString()
  };
};

export const toWebhookDelivery = (row: DeliveryRow): WebhookDelivery[] => {
  const event = webhookEventFromDb(row.event);

  return event
    ? [
        {
          id: row.id,
          event,
          status: row.status,
          attempt: row.attempt,
          responseStatus: row.responseStatus,
          createdAt: row.createdAt.toISOString(),
          deliveredAt: toIso(row.deliveredAt),
          nextAttemptAt: toIso(row.nextAttemptAt)
        }
      ]
    : [];
};
