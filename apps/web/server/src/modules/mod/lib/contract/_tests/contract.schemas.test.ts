import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { MOD_INGEST } from '../../../config';
import { ingestBatchSchema } from '../contract.schemas';

const example: { events: Record<string, unknown>[] } = JSON.parse(
  readFileSync(new URL('../../../../../../../../game/modpack/contract/examples/ingest.example.json', import.meta.url), 'utf8')
);

const nowSeconds = () => Math.floor(Date.now() / 1000);
const withEvent = (patch: (event: Record<string, unknown>) => Record<string, unknown>) => ({ ...example, events: example.events.map(patch) });

describe('ingestBatchSchema', () => {
  it('accepts the contract example', () => {
    expect(ingestBatchSchema.safeParse(example).success).toBe(true);
  });

  it('refuses a battle dated in the future, which would stay inside every recent window forever', () => {
    const future = nowSeconds() + MOD_INGEST.maxFutureSeconds + 3_600;
    const batch = withEvent((event) => (event.type === 'battle_result' ? { ...event, arena_created_at: future } : event));

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });

  it('refuses an event that claims to happen in the future', () => {
    const batch = withEvent((event) => ({ ...event, occurred_at: nowSeconds() + MOD_INGEST.maxFutureSeconds + 3_600 }));

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });
});
