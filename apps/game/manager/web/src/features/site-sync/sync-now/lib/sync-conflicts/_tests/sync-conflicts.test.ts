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
  const profiles = { local: 1, remote: 1, localChanges: 1, remoteChanges: 0 };

  it('does not count a plain upload as bringing changes', () => {
    expect(syncBroughtChanges({ profiles: { ...profiles, outcome: 'pushed' } })).toBe(false);
  });

  it('counts a sync that pulled remote data as bringing changes', () => {
    expect(syncBroughtChanges({ profiles: { ...profiles, outcome: 'pulled' } })).toBe(true);
  });
});
