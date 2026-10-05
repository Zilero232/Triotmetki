import type { ApiKey } from '@otmetki/schemas';

import type { ApiKeyRow } from './api-keys.types';

import { toIso } from '../../../common/lib';
import { API_KEY_PLUGIN } from '../../../lib/auth';
import { keyTierOf } from '../lib/api-key/api-key';

export const toApiKey = (row: ApiKeyRow): ApiKey => ({
  id: row.id,
  name: row.name ?? '',
  prefix: (row.start ?? '').slice(API_KEY_PLUGIN.prefix.length),
  tier: keyTierOf(row.metadata) ?? 'free',
  scopes: [],
  createdAt: row.createdAt.toISOString(),
  lastUsedAt: toIso(row.lastRequest),
  expiresAt: toIso(row.expiresAt),
  revokedAt: row.enabled ? null : row.updatedAt.toISOString()
});
