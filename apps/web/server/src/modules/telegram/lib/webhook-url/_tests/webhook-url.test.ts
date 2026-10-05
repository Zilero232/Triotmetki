import { describe, expect, it } from 'vitest';

import { WEBHOOK } from '../../../config/webhook.constants';
import { webhookUrl } from '../webhook-url';

describe('webhookUrl', () => {
  it('appends the webhook path to the API origin', () => {
    expect(webhookUrl('https://api.triotmetki.ru')).toBe(`https://api.triotmetki.ru/${WEBHOOK.path}`);
  });

  it('replaces any path of the base instead of nesting under it', () => {
    expect(webhookUrl('https://api.triotmetki.ru/v1/')).toBe(`https://api.triotmetki.ru/${WEBHOOK.path}`);
  });

  it('throws on a base that is not a URL', () => {
    expect(() => webhookUrl('api.triotmetki.ru')).toThrow();
  });
});
