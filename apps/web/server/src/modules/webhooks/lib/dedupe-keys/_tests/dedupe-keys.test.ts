import { describe, expect, it } from 'vitest';

import { markGainedKey } from '../dedupe-keys';

const mark = { accountId: 1, tankId: 2, marks: 3 } as const;

describe('markGainedKey', () => {
  it('keeps a mark the mod reported from suppressing the one the collector finds', () => {
    expect(markGainedKey({ source: 'mod', ...mark })).not.toBe(markGainedKey({ source: 'api', ...mark }));
  });

  it('deduplicates the same mark from the same source', () => {
    expect(markGainedKey({ source: 'mod', ...mark })).toBe(markGainedKey({ source: 'mod', ...mark }));
  });
});
