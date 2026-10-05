import report from '@contract/sync-report.json';
import { describe, expect, it } from 'vitest';

import { syncReportSchema } from '@/entities/site-sync';

import { syncBroughtChanges, syncConflicts } from '../sync-conflicts';

const parsed = syncReportSchema.parse(report);

describe('syncConflicts', () => {
  it('lists only the libraries changed on both sides', () => {
    expect(syncConflicts(parsed)).toEqual([{ library: 'profiles', localChanges: 1, remoteChanges: 2 }]);
  });

  it('is empty when nothing conflicts or profiles were not synced', () => {
    expect(syncConflicts({ profiles: null })).toEqual([]);
  });
});

describe('syncBroughtChanges', () => {
  it('tells a sync that changed local data apart from a plain upload', () => {
    const profiles = { local: 1, remote: 1, localChanges: 1, remoteChanges: 0 };

    expect(syncBroughtChanges({ profiles: { ...profiles, outcome: 'pushed' } })).toBe(false);
    expect(syncBroughtChanges({ profiles: { ...profiles, outcome: 'pulled' } })).toBe(true);
  });
});
