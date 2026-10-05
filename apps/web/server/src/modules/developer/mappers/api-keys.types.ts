import type { ApiKey } from '../../../../generated';

export type ApiKeyRow = Pick<ApiKey, 'createdAt' | 'enabled' | 'expiresAt' | 'id' | 'lastRequest' | 'name' | 'start' | 'updatedAt'> & {
  metadata: unknown;
};
