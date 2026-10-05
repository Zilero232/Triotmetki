import { describe, expect, it } from 'vitest';

import { BONUS_CODE } from '../../../config/bonus-codes.constants';
import { bonusCodeStatus, reportedStatus, reportTallies } from '../bonus-status';

const now = new Date('2026-09-25T00:00:00Z');
const enough = BONUS_CODE.minReports;

describe('bonusCodeStatus', () => {
  it('stays unknown until enough people reported', () => {
    expect(bonusCodeStatus({ working: enough - 1, expired: 0, expiresAt: null, now })).toBe('unknown');
  });

  it('follows a clear majority either way', () => {
    expect(bonusCodeStatus({ working: enough, expired: 0, expiresAt: null, now })).toBe('working');
    expect(bonusCodeStatus({ working: 0, expired: enough, expiresAt: null, now })).toBe('expired');
  });

  it('stays unknown when reports are split', () => {
    expect(bonusCodeStatus({ working: enough, expired: enough, expiresAt: null, now })).toBe('unknown');
  });

  it('expires on the published deadline regardless of reports', () => {
    expect(bonusCodeStatus({ working: 10, expired: 0, expiresAt: now, now })).toBe('expired');
    expect(bonusCodeStatus({ working: 10, expired: 0, expiresAt: new Date(now.getTime() + 1), now })).toBe('working');
  });
});

describe('reportTallies', () => {
  it('splits verdict counts per code and ignores already-used reports', () => {
    const tallies = reportTallies({
      counts: [
        { code: 'A', verdict: 'working', count: 2 },
        { code: 'A', verdict: 'expired', count: 1 },
        { code: 'A', verdict: 'alreadyUsed', count: 5 },
        { code: 'B', verdict: 'expired', count: 3 }
      ],
      latest: [{ code: 'A', createdAt: now }]
    });

    expect(tallies.get('A')).toEqual({ working: 2, expired: 1, lastReportAt: now });
    expect(tallies.get('B')).toEqual({ working: 0, expired: 3, lastReportAt: null });
  });

  it('keeps the latest report of a code with nothing inside the window', () => {
    expect(reportTallies({ counts: [], latest: [{ code: 'A', createdAt: now }] }).get('A')).toEqual({ working: 0, expired: 0, lastReportAt: now });
  });
});

describe('reportedStatus', () => {
  it('resets the counters of a code nobody reported', () => {
    expect(reportedStatus({ tally: undefined, expiresAt: null, now })).toEqual({
      workingReports: 0,
      expiredReports: 0,
      lastReportAt: null,
      status: 'unknown'
    });
  });
});
