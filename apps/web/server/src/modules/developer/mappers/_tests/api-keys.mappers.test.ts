import { describe, expect, it } from 'vitest';

import { API_KEY_PLUGIN } from '../../../../lib/auth';
import { toApiKey } from '../api-keys.mappers';

const createdAt = new Date('2026-09-25T10:00:00Z');

const row = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'bot',
  start: `${API_KEY_PLUGIN.prefix}AbCdEfGh`,
  enabled: true,
  metadata: '{"tier":"plus"}',
  createdAt,
  updatedAt: new Date('2026-09-25T11:00:00Z'),
  lastRequest: null,
  expiresAt: null
};

describe('toApiKey', () => {
  it('shows the characters after the key prefix and the tier the key runs on', () => {
    const key = toApiKey(row);

    expect(key.prefix).toBe('AbCdEfGh');
    expect(key.tier).toBe('plus');
    expect(key.revokedAt).toBeNull();
  });

  it('reports a disabled key as revoked when it was switched off', () => {
    expect(toApiKey({ ...row, enabled: false }).revokedAt).toBe(row.updatedAt.toISOString());
  });
});
