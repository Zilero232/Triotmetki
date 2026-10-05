import type { Redis } from 'ioredis';

export type WatermarkedRow = {
  receivedAt: Date;
};

export type WatermarkBatch<Row> = {
  rows: Row[];
  since: Date;
};

export type AdvanceWatermarkInput<Row> = {
  redis: Redis;
  key: string;
  now: Date;
  fetch: (since: Date) => Promise<Row[]>;
  process: (batch: WatermarkBatch<Row>) => Promise<number>;
};
