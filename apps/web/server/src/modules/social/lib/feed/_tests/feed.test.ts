import { describe, expect, it } from 'vitest';

import { FEED } from '../../../config/feed.constants';
import { buildFeed, isMarkGain, isMasteryGain } from '../feed';

const at = (iso: string) => new Date(iso);

describe('isMarkGain', () => {
  it('needs a known previous value that is lower', () => {
    expect(isMarkGain({ marksOnGun: 2, prevMarks: 1 })).toBe(true);
    expect(isMarkGain({ marksOnGun: 2, prevMarks: 2 })).toBe(false);
    expect(isMarkGain({ marksOnGun: 1, prevMarks: null })).toBe(false);
  });
});

describe('isMasteryGain', () => {
  it('fires only on reaching the top mastery', () => {
    expect(isMasteryGain({ row: { markOfMastery: FEED.aceMastery, prevMastery: FEED.aceMastery - 1 }, aceMastery: FEED.aceMastery })).toBe(true);
    expect(isMasteryGain({ row: { markOfMastery: FEED.aceMastery - 1, prevMastery: 0 }, aceMastery: FEED.aceMastery })).toBe(false);
  });
});

describe('buildFeed', () => {
  it('merges every kind newest first and caps the list', () => {
    const items = buildFeed({
      snapshots: [
        { accountId: 1, tankId: 10, capturedAt: at('2026-09-20T10:00:00Z'), marksOnGun: 3, prevMarks: 2, markOfMastery: 4, prevMastery: 3 }
      ],
      records: [{ accountId: 1, capturedAt: at('2026-09-21T10:00:00Z'), maxDamage: 9000, prevMaxDamage: 8000, maxDamageTankId: 10 }],
      badges: [{ accountId: 2n, badgeCode: 'weekly-mark-1', awardedAt: at('2026-09-22T10:00:00Z') }],
      nicknames: new Map([[1n, 'Tanker']]),
      aceMastery: FEED.aceMastery,
      limit: 3,
      badgeOf: (code) => ({ code, challenge: null })
    });

    expect(items.map((item) => item.kind)).toEqual(['badge', 'record', 'mark']);
    expect(items[1]?.nickname).toBe('Tanker');
  });

  it('describes a badge through the given lookup and leaves other kinds without one', () => {
    const items = buildFeed({
      snapshots: [],
      records: [{ accountId: 1, capturedAt: at('2026-09-21T10:00:00Z'), maxDamage: 9000, prevMaxDamage: 8000, maxDamageTankId: 10 }],
      badges: [{ accountId: 2n, badgeCode: 'weekly-mark-1', awardedAt: at('2026-09-22T10:00:00Z') }],
      nicknames: new Map(),
      aceMastery: FEED.aceMastery,
      limit: FEED.limit,
      badgeOf: (code) => ({ code: code.toUpperCase(), challenge: null })
    });

    expect(items.map((item) => item.badge?.code ?? null)).toEqual(['WEEKLY-MARK-1', null]);
  });
});
