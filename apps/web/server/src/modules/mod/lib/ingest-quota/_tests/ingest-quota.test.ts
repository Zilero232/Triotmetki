import { describe, expect, it } from 'vitest';

import { ingestQuotaKey } from '../ingest-quota';

const EVENING = new Date('2026-10-06T20:59:30.000Z');
const NEXT_MORNING = new Date('2026-10-06T21:00:30.000Z');

describe('ingestQuotaKey', () => {
  it('starts a new quota at Moscow midnight', () => {
    const evening = ingestQuotaKey({ kind: 'events', accountId: 1n, now: EVENING });
    const morning = ingestQuotaKey({ kind: 'events', accountId: 1n, now: NEXT_MORNING });

    expect(evening).not.toBe(morning);
  });

  it('keeps one quota per account', () => {
    const first = ingestQuotaKey({ kind: 'events', accountId: 1n, now: EVENING });
    const second = ingestQuotaKey({ kind: 'events', accountId: 2n, now: EVENING });

    expect(first).not.toBe(second);
  });

  it('counts events and battles apart', () => {
    const events = ingestQuotaKey({ kind: 'events', accountId: 1n, now: EVENING });
    const battles = ingestQuotaKey({ kind: 'battles', accountId: 1n, now: EVENING });

    expect(events).not.toBe(battles);
  });
});
