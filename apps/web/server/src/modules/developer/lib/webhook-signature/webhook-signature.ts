import { WEBHOOK } from '@otmetki/schemas';
import { getUnixTime } from 'date-fns';
import { randomBytes } from 'node:crypto';
import { Webhook } from 'standardwebhooks';

import type { WebhookHeadersInput } from './webhook-signature.types';

import { WEBHOOK_DELIVERY } from '../../config/webhook-delivery.constants';

export const generateWebhookSecret = (): string => `${WEBHOOK.secretPrefix}${randomBytes(WEBHOOK_DELIVERY.secretBytes).toString('base64')}`;

export const webhookHeaders = ({ secret, body, event, deliveryId, sentAt }: WebhookHeadersInput): Record<string, string> => ({
  'content-type': 'application/json',
  'user-agent': WEBHOOK_DELIVERY.userAgent,
  [WEBHOOK.eventHeader]: event,
  [WEBHOOK.deliveryHeader]: deliveryId,
  [WEBHOOK.timestampHeader]: String(getUnixTime(sentAt)),
  [WEBHOOK.signatureHeader]: new Webhook(secret).sign(deliveryId, sentAt, body)
});
