import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { tankIdOf } from '../../../ids/ids';
import { isRegularVehicle, parseVehicleList } from '../vehicle-list';

const xml = readFileSync(new URL('fixtures/list.xml', import.meta.url), 'utf8');

describe('parseVehicleList', () => {
  const entries = parseVehicleList({ xml, nation: 'ussr' });
  const byTag = new Map(entries.map((entry) => [entry.tag, entry]));

  it('reads every vehicle of the list with its compact tank id', () => {
    expect(entries.map((entry) => entry.tag)).toEqual([
      'Observer',
      'R01_IS',
      'R54_KV-5',
      'R04_T-34_MapsTraining_Player_MT_1',
      'R106_KV85',
      'R115_IS-3_auto_test'
    ]);

    for (const entry of entries) {
      expect(entry.tankId).toBe(tankIdOf({ nation: 'ussr', id: entry.id }));
    }
  });

  it('derives class, tier, role and flags from tags and price', () => {
    const is = byTag.get('R01_IS');
    const kv5 = byTag.get('R54_KV-5');

    expect(is).toMatchObject({ type: 'heavyTank', tier: 7, role: 'role_HT_break', isPremium: false, name: 'IS' });
    expect(is?.price?.currency).toBe('credits');
    expect(kv5?.isPremium).toBe(kv5?.price?.currency === 'gold');
    expect(kv5?.isPremium).toBe(true);
    expect(byTag.get('R106_KV85')?.isCollectible).toBe(true);
    expect(byTag.get('R04_T-34_MapsTraining_Player_MT_1')?.isClone).toBe(true);
  });

  it('keeps regular vehicles and drops observers, clones and test builds', () => {
    expect(entries.filter(isRegularVehicle).map((entry) => entry.tag)).toEqual(['R01_IS', 'R54_KV-5', 'R106_KV85']);
  });
});
