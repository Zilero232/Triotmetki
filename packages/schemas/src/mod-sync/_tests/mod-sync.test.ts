import { describe, expect, it } from 'vitest';

import { MOD_SYNC } from '../mod-sync.constants';
import { modProfilesWriteRequestSchema, modSetsWriteRequestSchema } from '../mod-sync.schemas';

const device = { device_id: 'dev_Q2xhdWRlQm9uZA', account_id: 12_345 };
const set = { id: 'set-1', name: 'Streams', components: ['core', 'hit_log'], created: 1_700_000_000, updated: 1_700_000_100.5 };
const profile = { id: 'p_1', name: 'Main', created: null, updated: null, data: { config: { hud_scale: 1 }, components: {} } };

describe('modSetsWriteRequestSchema', () => {
  it('accepts a merge of sets and tombstones', () => {
    expect(modSetsWriteRequestSchema.safeParse({ ...device, sets: [set], deleted: [{ id: 'old', deleted: 5 }], mode: 'merge' }).success).toBe(true);
  });

  it('trims the name and refuses one that is blank or too long', () => {
    const parse = (name: string) => modSetsWriteRequestSchema.safeParse({ ...device, sets: [{ ...set, name }], deleted: [], mode: 'merge' });

    expect(parse('  Streams  ').data?.sets[0]?.name).toBe('Streams');
    expect(parse('   ').success).toBe(false);
    expect(parse('x'.repeat(MOD_SYNC.nameMaxLength + 1)).success).toBe(false);
  });

  it('refuses an id outside the allowed alphabet and a negative time', () => {
    expect(modSetsWriteRequestSchema.safeParse({ ...device, sets: [{ ...set, id: 'a/b' }], deleted: [], mode: 'merge' }).success).toBe(false);
    expect(modSetsWriteRequestSchema.safeParse({ ...device, sets: [{ ...set, updated: -1 }], deleted: [], mode: 'merge' }).success).toBe(false);
  });

  it('refuses more sets and tombstones than the library keeps', () => {
    const sets = Array.from({ length: MOD_SYNC.maxSets + 1 }, (_, index) => ({ ...set, id: `s${index}` }));
    const deleted = Array.from({ length: MOD_SYNC.maxTombstones + 1 }, (_, index) => ({ id: `t${index}`, deleted: index }));

    expect(modSetsWriteRequestSchema.safeParse({ ...device, sets, deleted: [], mode: 'merge' }).success).toBe(false);
    expect(modSetsWriteRequestSchema.safeParse({ ...device, sets: [], deleted, mode: 'merge' }).success).toBe(false);
  });

  it('refuses an unknown mode and a field beyond the contract', () => {
    expect(modSetsWriteRequestSchema.safeParse({ ...device, sets: [], deleted: [], mode: 'append' }).success).toBe(false);
    expect(modSetsWriteRequestSchema.safeParse({ ...device, sets: [], deleted: [], mode: 'merge', extra: 1 }).success).toBe(false);
  });
});

describe('modProfilesWriteRequestSchema', () => {
  it('accepts a profile never saved with a time', () => {
    expect(modProfilesWriteRequestSchema.safeParse({ ...device, profiles: [profile], deleted: [], mode: 'replace' }).success).toBe(true);
  });

  it('refuses profile data past the size limit', () => {
    const data = { config: { blob: 'x'.repeat(MOD_SYNC.maxProfileDataBytes) }, components: {} };

    expect(modProfilesWriteRequestSchema.safeParse({ ...device, profiles: [{ ...profile, data }], deleted: [], mode: 'merge' }).success).toBe(false);
  });

  it('keeps the components a profile installs', () => {
    const parsed = modProfilesWriteRequestSchema.safeParse({
      ...device,
      profiles: [{ ...profile, installed: ['core', 'hit_log'] }],
      deleted: [],
      mode: 'merge'
    });

    expect(parsed.data?.profiles[0]?.installed).toEqual(['core', 'hit_log']);
  });

  it('refuses an installed component id outside the allowed alphabet', () => {
    const parsed = modProfilesWriteRequestSchema.safeParse({
      ...device,
      profiles: [{ ...profile, installed: ['Core!'] }],
      deleted: [],
      mode: 'merge'
    });

    expect(parsed.success).toBe(false);
  });
});
