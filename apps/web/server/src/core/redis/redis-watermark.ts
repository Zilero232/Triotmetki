import type { AdvanceWatermarkInput, WatermarkedRow } from './redis-watermark.types';

export const advanceWatermark = async <Row extends WatermarkedRow>({
  redis,
  key,
  now,
  fetch,
  process
}: AdvanceWatermarkInput<Row>): Promise<number> => {
  const stored = await redis.get(key);

  if (!stored) {
    await redis.set(key, now.toISOString());

    return 0;
  }

  const since = new Date(stored);
  const rows = await fetch(since);
  const last = rows.at(-1);

  if (!last) {
    return 0;
  }

  const processed = await process({ rows, since });

  await redis.set(key, last.receivedAt.toISOString());

  return processed;
};
