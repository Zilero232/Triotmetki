import { ARMOR_FLAGS, hasArmorFlag } from '@otmetki/gamedata';
import { describe, expect, it } from 'vitest';

import { COLLISION_FIXTURES, loadIs, readFixture } from '../../../_tests/fixtures';
import { parseCollision } from '../../../parsers/collision/collision';
import { joinArmorModel, weldVertices } from '../join';

const spec = loadIs();
const collision = parseCollision(readFixture(COLLISION_FIXTURES.collision));
const joined = joinArmorModel({ spec, collision });
const plateOf = (plates: { name: string; thickness: number; flags: number }[], name: string) => plates.find((plate) => plate.name === name);

describe('joinArmorModel', () => {
  it('takes thickness from our XML, not from the mirror', () => {
    expect(plateOf(joined.modules.hull.plates, 'armor_1')?.thickness).toBe(spec.hull.armor.armor_1);
    expect(collision.armor.Hull.armor_1).not.toBe(spec.hull.armor.armor_1);
  });

  it('logs a thickness that disagrees with the mirror', () => {
    expect(joined.mismatches.some((line) => line.includes('Hull.armor_1'))).toBe(true);
  });

  it('flags zero plates as hollow and track plates as tracks', () => {
    expect(hasArmorFlag({ flags: plateOf(joined.modules.hull.plates, 'armor_12')?.flags ?? 0, flag: 'hollow' })).toBe(true);

    for (const chassis of joined.modules.chassis) {
      expect(chassis.plates.every(({ flags }) => hasArmorFlag({ flags, flag: 'track' }))).toBe(true);
    }
  });

  it('marks optics and the barrel as modules without logging a missing thickness for them', () => {
    const optics = plateOf(joined.modules.hull.plates, 'surveyingDevice');

    expect(optics?.flags).toBe(ARMOR_FLAGS.module);
    expect(joined.mismatches.some((line) => line.includes('surveyingDevice'))).toBe(false);
  });

  it('carries the spaced flag of mantlet plates into the gun module', () => {
    const gun = joined.modules.turrets.flatMap(({ guns }) => guns).find(({ piece }) => piece === 'Gun_01');
    const mantlet = plateOf(gun?.plates ?? [], 'armor_1');
    const barrel = plateOf(gun?.plates ?? [], 'gun');

    expect(hasArmorFlag({ flags: mantlet?.flags ?? 0, flag: 'spaced' })).toBe(true);
    expect(hasArmorFlag({ flags: mantlet?.flags ?? 0, flag: 'gun' })).toBe(true);
    expect(hasArmorFlag({ flags: barrel?.flags ?? 0, flag: 'module' })).toBe(true);
    expect(hasArmorFlag({ flags: barrel?.flags ?? 0, flag: 'spaced' })).toBe(false);
  });

  it('maps guns to pieces through the hit tester and turrets by their order', () => {
    expect(joined.modules.turrets.map(({ piece }) => piece)).toEqual(['Turret_01', 'Turret_02']);
    expect(joined.modules.turrets.flatMap(({ guns }) => guns.map(({ piece }) => piece))).toEqual(expect.arrayContaining(['Gun_01', 'Gun_10']));
  });

  it('lists every shot of a gun as a shell option with its penetration', () => {
    const gun = joined.modules.turrets.flatMap(({ guns }) => guns)[0];
    const source = spec.turrets.flatMap(({ guns }) => guns)[0];

    expect(gun.shells.map(({ name }) => name)).toEqual(source.shots.map(({ shell }) => shell));
    expect(gun.shells[0].penetration).toEqual(source.shots[0].piercingPower);
  });

  it('uses the shell display names it is given', () => {
    const shot = spec.turrets[0].guns[0].shots[0];
    const named = joinArmorModel({ spec, collision, shellNames: new Map([[shot.shellId ?? -1, 'UBR-471']]) });

    expect(named.modules.turrets[0].guns[0].shells[0].displayName).toBe('UBR-471');
  });

  it('keeps only the pieces some module uses and the mirror mounts', () => {
    expect(joined.geometry.pieces.map(({ name }) => name).toSorted()).toEqual(['Chassis', 'Gun_01', 'Gun_10', 'Hull', 'Turret_01', 'Turret_02']);
    expect(joined.geometry.mounts.hull).toEqual(collision.hullPosition);
  });

  it('refuses a model without a hull', () => {
    const { Hull: _hull, ...parts } = collision.parts;

    expect(() => joinArmorModel({ spec, collision: { ...collision, parts } })).toThrow(/no hull/);
  });

  it('logs a declared piece that the model does not have and falls back to the first of its kind', () => {
    const renamed = { ...spec, hull: { ...spec.hull, collision: 'Hull_02' } };
    const result = joinArmorModel({ spec: renamed, collision });

    expect(result.modules.hull.piece).toBe('Hull');
    expect(result.mismatches.some((line) => line.includes('Hull_02'))).toBe(true);
  });
});

describe('weldVertices', () => {
  it('merges identical positions and rewrites the indices onto them', () => {
    const welded = weldVertices({ positions: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0], indices: [0, 1, 3, 2, 1, 3] });

    expect([...welded.positions]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect([...welded.indices]).toEqual([0, 1, 2, 0, 1, 2]);
  });
});
