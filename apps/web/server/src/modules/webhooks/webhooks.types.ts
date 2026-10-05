import type { WebhookEvent } from '@otmetki/schemas';

export type WebhookSubject = {
  accountIds: number[];
  clanIds: number[];
};

export type EmitWebhookInput = {
  event: WebhookEvent;
  subject: WebhookSubject;
  data: Record<string, unknown>;
  dedupeKey?: string;
};

export type WebhookEmitter = {
  emit: (input: EmitWebhookInput) => Promise<number>;
};
