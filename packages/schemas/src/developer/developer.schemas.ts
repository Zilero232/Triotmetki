import * as z from 'zod';

import { accountIdSchema, clanIdSchema, countSchema, isoDateSchema, isoDateTimeSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { API_KEY, WEBHOOK } from './developer.constants';

export const apiTierSchema = z.enum(['free', 'plus', 'community']);

export const apiTierLimitsSchema = z.object({
  requestsPerDay: z.number().int().positive(),
  requestsPerSecond: z.number().int().positive(),
  webhooks: countSchema
});

const apiTierOfferSchema = z.object({
  tier: apiTierSchema,
  limits: apiTierLimitsSchema
});

export const apiTiersSchema = z.array(apiTierOfferSchema);

export const apiKeySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  prefix: z.string().length(API_KEY.prefixLength),
  tier: apiTierSchema,
  scopes: z.array(z.string()),
  createdAt: isoDateTimeSchema,
  lastUsedAt: isoDateTimeSchema.nullable(),
  expiresAt: isoDateTimeSchema.nullable(),
  revokedAt: isoDateTimeSchema.nullable()
});

export const apiKeysSchema = z.array(apiKeySchema);

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(API_KEY.maxNameLength),
  expiresAt: isoDateTimeSchema.optional()
});

export const createdApiKeySchema = z.object({
  key: apiKeySchema,
  secret: z.string().min(32).describe(`The full key for the ${API_KEY.header} header; shown only once`)
});

export const apiUsagePointSchema = z.object({
  day: isoDateSchema,
  requests: countSchema,
  errors: countSchema,
  throttled: countSchema,
  avgLatencyMs: z.number().nonnegative().nullable()
});

export const apiUsageQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30)
});

export const apiUsageSchema = z.object({
  apiKeyId: uuidSchema,
  tier: apiTierSchema,
  limits: apiTierLimitsSchema,
  today: apiUsagePointSchema,
  history: z.array(apiUsagePointSchema),
  topEndpoints: z.array(z.object({ endpoint: z.string(), requests: countSchema }))
});

export const apiErrorLogEntrySchema = z.object({
  id: uuidSchema,
  method: z.string(),
  path: z.string(),
  status: z.number().int(),
  code: z.string().nullable(),
  message: z.string().nullable(),
  occurredAt: isoDateTimeSchema
});

export const apiErrorLogSchema = z.array(apiErrorLogEntrySchema);

export const developerOverviewSchema = z.object({
  tier: apiTierSchema,
  limits: apiTierLimitsSchema,
  keys: apiKeysSchema,
  webhooks: countSchema
});

export const webhookEventSchema = z.enum(WEBHOOK.events);

export const webhookFilterSchema = z
  .object({
    accountIds: z.array(accountIdSchema).max(WEBHOOK.maxFilterIds).optional(),
    clanIds: z.array(clanIdSchema).max(WEBHOOK.maxFilterIds).optional()
  })
  .refine(({ accountIds, clanIds }) => (accountIds?.length ?? 0) + (clanIds?.length ?? 0) > 0, {
    message: 'Subscribe to at least one player or clan'
  })
  .describe('mark.gained and session.ended fire for accountIds (and members of clanIds); clan.member_changed fires for clanIds');

export const webhookEndpointSchema = z.object({
  id: uuidSchema,
  url: z.url({ protocol: /^https$/ }),
  events: z.array(webhookEventSchema).min(1),
  filter: webhookFilterSchema,
  isActive: z.boolean(),
  failureCount: countSchema,
  disabledAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema
});

export const webhookEndpointsSchema = z.array(webhookEndpointSchema);

export const createWebhookEndpointSchema = webhookEndpointSchema.pick({ url: true, events: true, filter: true });

export const updateWebhookEndpointSchema = z.object({
  url: webhookEndpointSchema.shape.url.optional(),
  events: webhookEndpointSchema.shape.events.optional(),
  filter: webhookFilterSchema.optional(),
  isActive: z.boolean().optional()
});

export const createdWebhookEndpointSchema = z.object({
  endpoint: webhookEndpointSchema,
  secret: z.string().startsWith(WEBHOOK.secretPrefix).min(32).describe('Standard Webhooks signing secret (whsec_…); shown only once')
});

export const webhookDeliverySchema = z.object({
  id: uuidSchema,
  event: webhookEventSchema,
  status: z.enum(['pending', 'succeeded', 'failed']),
  attempt: countSchema,
  responseStatus: z.number().int().nullable(),
  createdAt: isoDateTimeSchema,
  deliveredAt: isoDateTimeSchema.nullable(),
  nextAttemptAt: isoDateTimeSchema.nullable()
});

export const webhookDeliveriesSchema = z.array(webhookDeliverySchema);

export const webhookPayloadSchema = z
  .object({
    id: uuidSchema,
    event: webhookEventSchema,
    createdAt: isoDateTimeSchema,
    data: z.record(z.string(), z.unknown())
  })
  .describe(
    `Signed per Standard Webhooks (standardwebhooks.com): ${WEBHOOK.deliveryHeader}, ${WEBHOOK.timestampHeader} and ${WEBHOOK.signatureHeader} (${WEBHOOK.signatureScheme},<base64 HMAC-SHA256>)`
  );
