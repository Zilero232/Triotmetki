import type { z } from 'zod';

import type {
  apiErrorLogEntrySchema,
  apiErrorLogSchema,
  apiKeySchema,
  apiKeysSchema,
  apiTierLimitsSchema,
  apiTierSchema,
  apiTiersSchema,
  apiUsagePointSchema,
  apiUsageQuerySchema,
  apiUsageSchema,
  createApiKeySchema,
  createdApiKeySchema,
  createdWebhookEndpointSchema,
  createWebhookEndpointSchema,
  developerOverviewSchema,
  updateWebhookEndpointSchema,
  webhookDeliveriesSchema,
  webhookDeliverySchema,
  webhookEndpointSchema,
  webhookEndpointsSchema,
  webhookEventSchema,
  webhookFilterSchema,
  webhookPayloadSchema
} from './developer.schemas';

export type ApiTier = z.infer<typeof apiTierSchema>;
export type ApiTierLimits = z.infer<typeof apiTierLimitsSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type ApiKeys = z.infer<typeof apiKeysSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreatedApiKey = z.infer<typeof createdApiKeySchema>;
export type ApiUsagePoint = z.infer<typeof apiUsagePointSchema>;
export type ApiUsageQuery = z.infer<typeof apiUsageQuerySchema>;
export type ApiUsage = z.infer<typeof apiUsageSchema>;
export type ApiErrorLogEntry = z.infer<typeof apiErrorLogEntrySchema>;
export type ApiErrorLog = z.infer<typeof apiErrorLogSchema>;
export type ApiTiers = z.infer<typeof apiTiersSchema>;
export type DeveloperOverview = z.infer<typeof developerOverviewSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export type WebhookFilter = z.infer<typeof webhookFilterSchema>;
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;
export type WebhookEndpoints = z.infer<typeof webhookEndpointsSchema>;
export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;
export type UpdateWebhookEndpointInput = z.infer<typeof updateWebhookEndpointSchema>;
export type CreatedWebhookEndpoint = z.infer<typeof createdWebhookEndpointSchema>;
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;
export type WebhookDeliveries = z.infer<typeof webhookDeliveriesSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
