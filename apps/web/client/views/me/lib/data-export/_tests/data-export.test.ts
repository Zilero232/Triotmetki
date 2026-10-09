import type { AnalyticsExport, RawStatsExport } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import { DATA_FILE } from '@/shared/lib/data-file';

import { exportFile, isRawExport } from '../data-export';

const raw: RawStatsExport = {
  generatedAt: '2026-09-26T10:00:00.000Z',
  accounts: [],
  tanks: [{ accountId: 1, tankId: 10, battles: 5, wins: 3, markOfMastery: 2, marksOnGun: null, lastBattleAt: null }]
};

const analytics: AnalyticsExport = { generatedAt: '2026-09-26T10:00:00.000Z', sessions: [], battles: [], tankProgress: [] };

describe('isRawExport', () => {
  it('tells the free raw exports from the analytics ones', () => {
    expect(isRawExport('rawJson')).toBe(true);
    expect(isRawExport('tanksCsv')).toBe(true);
    expect(isRawExport('analyticsJson')).toBe(false);
    expect(isRawExport('battlesCsv')).toBe(false);
  });
});

describe('exportFile', () => {
  it('writes the tanks table as csv with a dated name', () => {
    const file = exportFile({ kind: 'tanksCsv', data: raw, date: '2026-09-26' });

    expect(file.name).toMatch(/2026-09-26.*\.csv$/u);
    expect(file.type).toBe(DATA_FILE.csvType);
    expect(file.content.split(DATA_FILE.csvNewline)[0]).toContain('tankId');
  });

  it('writes the whole export as json that parses back', () => {
    const file = exportFile({ kind: 'analyticsJson', data: analytics, date: '2026-09-26' });

    expect(file.type).toBe(DATA_FILE.jsonType);
    expect(JSON.parse(file.content)).toEqual(analytics);
  });

  it('writes an empty file for an empty table', () => {
    expect(exportFile({ kind: 'sessionsCsv', data: analytics, date: '2026-09-26' }).content).toBe('');
  });
});
