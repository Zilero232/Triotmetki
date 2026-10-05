import type { WebhookDelivery, WebhookEndpoint } from '../../../../generated';

export type EndpointRow = Pick<WebhookEndpoint, 'createdAt' | 'disabledAt' | 'events' | 'failureCount' | 'filter' | 'id' | 'isActive' | 'url'>;

export type DeliveryRow = Pick<
  WebhookDelivery,
  'attempt' | 'createdAt' | 'deliveredAt' | 'event' | 'id' | 'nextAttemptAt' | 'responseStatus' | 'status'
>;
