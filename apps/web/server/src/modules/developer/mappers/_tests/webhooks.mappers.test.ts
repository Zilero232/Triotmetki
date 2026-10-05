import { describe, expect, it } from 'vitest';

import type { DeliveryRow, EndpointRow } from '../webhooks.types';

import { toWebhookDelivery, toWebhookEndpoint } from '../webhooks.mappers';

const CREATED = new Date('2026-09-20T00:00:00Z');

const endpoint = (fields: Partial<EndpointRow> = {}): EndpointRow => ({
  id: 'e1',
  url: 'https://hooks.test/in',
  events: ['moeGained', 'moeThresholdDropped'],
  filter: null,
  isActive: true,
  failureCount: 0,
  disabledAt: null,
  createdAt: CREATED,
  ...fields
});

const delivery = (fields: Partial<DeliveryRow> = {}): DeliveryRow => ({
  id: 'd1',
  event: 'moeGained',
  status: 'succeeded',
  attempt: 1,
  responseStatus: 200,
  createdAt: CREATED,
  deliveredAt: CREATED,
  nextAttemptAt: null,
  ...fields
});

describe('toWebhookEndpoint', () => {
  it('lists only events the public API knows', () => {
    expect(toWebhookEndpoint(endpoint()).events).toEqual(['mark.gained']);
  });

  it('drops notification events outside the webhook subset', () => {
    expect(toWebhookEndpoint(endpoint({ events: ['moeGained', 'bonusCode', 'goalReached'] })).events).toEqual(['mark.gained']);
  });

  it('reads a missing filter as an empty one', () => {
    expect(toWebhookEndpoint(endpoint()).filter).toEqual({ accountIds: [], clanIds: [] });
  });

  it('keeps a stored filter', () => {
    expect(toWebhookEndpoint(endpoint({ filter: { accountIds: [1], clanIds: [2] } })).filter).toEqual({ accountIds: [1], clanIds: [2] });
  });
});

describe('toWebhookDelivery', () => {
  it('hides a delivery of an internal-only event', () => {
    expect(toWebhookDelivery(delivery({ event: 'moeThresholdDropped' }))).toEqual([]);
  });

  it('hides a delivery of a notification event that is not a webhook event', () => {
    expect(toWebhookDelivery(delivery({ event: 'premiumOffer' }))).toEqual([]);
  });

  it('maps a public event delivery', () => {
    expect(toWebhookDelivery(delivery())).toEqual([expect.objectContaining({ id: 'd1', event: 'mark.gained', nextAttemptAt: null })]);
  });
});
