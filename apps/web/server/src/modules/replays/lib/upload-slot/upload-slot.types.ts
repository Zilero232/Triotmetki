import type { Redis } from 'ioredis';

export type ClaimUploadSlotInput = {
  redis: Redis;
  key: string;
  limit: number;
  ttlSeconds: number;
};

export type ReleaseUploadSlotInput = {
  redis: Redis;
  key: string;
};
