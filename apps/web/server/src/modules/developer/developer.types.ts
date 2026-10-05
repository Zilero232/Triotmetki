import type { ApiTier, ApiUsageQuery, CreateApiKeyInput, CreateWebhookEndpointInput, UpdateWebhookEndpointInput } from '@otmetki/schemas';

export type AuthenticatedApiKey = {
  id: string;
  userId: string;
  tier: ApiTier;
  dailyLimit: number;
  dailyRemaining: number;
};

export type OwnedKeyInput = {
  userId: string;
  id: string;
};

export type CreateKeyInput = CreateApiKeyInput & {
  userId: string;
};

export type ApplyTierInput = {
  userId: string;
  tier: ApiTier;
};

export type RejectKeyInput = {
  raw: string;
  code: string | undefined;
};

export type UsageInput = OwnedKeyInput & ApiUsageQuery;

export type CreateEndpointInput = CreateWebhookEndpointInput & {
  userId: string;
};

export type UpdateEndpointInput = UpdateWebhookEndpointInput & OwnedKeyInput;

export type DeliverInput = {
  deliveryId: string;
  attempt: number;
  isFinal: boolean;
};

export type FailDeliveryInput = {
  deliveryId: string;
  endpointId: string;
  attempt: number;
  responseStatus: number | null;
  responseBody: string | null;
  isFinal: boolean;
};

export type SessionEndedEvent = {
  sessionId: string;
  accountId: bigint;
};

export type SessionEventsSink = {
  ended: (event: SessionEndedEvent) => Promise<void>;
};
