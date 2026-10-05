import { describe, expect, it } from 'vitest';

import { loadIs, readFixture, VEHICLE_FIXTURES } from '../../../_tests/fixtures';
import { makeCompactDescr, nationId } from '../../../ids/ids';
import { get, num, parseXml } from '../../../xml/xml';
import { parseShells } from '../shells/shells';
import { parseCollisionPiece, parseSpacedArmor } from '../vehicle-parts/vehicle-parts';

const vehicleXml = parseXml(readFixture(VEHICLE_FIXTURES.vehicle));
const sharedGuns = parseXml(readFixture(VEHICLE_FIXTURES.components.guns));
const TOP_GUN = '_122-mm_D-25T_with_wedges_shutter';

describe('parseShells', () => {
  const shells = parseShells({ xml: readFixture(VEHICLE_FIXTURES.shells), nation: 'ussr' });

  it('reads kind, caliber, damage and premium flag', () => {
    const ap = shells['_122mm_UBR-471'];
    const apcr = shells['_122mm_UBR-471P'];
    const he = shells['_122mm_UOF-471'];

    expect(ap).toMatchObject({ kind: 'ARMOR_PIERCING', caliber: 122, isPremium: false });
    expect(ap.damage.armor).toBeGreaterThan(0);
    expect(apcr).toMatchObject({ kind: 'ARMOR_PIERCING_CR', isPremium: true });
    expect(he.kind).toBe('HIGH_EXPLOSIVE');
    expect(he.explosionRadius).toBeGreaterThan(0);
    expect(ap.shellId).toBe(makeCompactDescr({ itemType: 'shell', nationId: nationId('ussr'), id: ap.id }));
  });
});

describe('parseVehicle', () => {
  const vehicle = loadIs();
  const turret = vehicle.turrets.find((item) => item.name === 'IS-122');
  const gun = turret?.guns.find((item) => item.name === TOP_GUN);

  it('reads crew, speed limits and hull armor', () => {
    expect(vehicle.crew.map((member) => member.role)).toEqual(['commander', 'gunner', 'driver', 'loader']);
    expect(vehicle.crew[0].extraRoles).toEqual(['radioman']);
    expect(vehicle.speedLimits.forward).toBe(num(get({ value: vehicleXml, path: 'speedLimits/forward' })));

    expect(vehicle.hull.primaryArmor).toEqual([vehicle.hull.armor.armor_1, vehicle.hull.armor.armor_7, vehicle.hull.armor.armor_4]);

    expect(vehicle.postProgressionTree).toBe('role_HT_break');
  });

  it('lists modules in file order with compact ids', () => {
    expect(vehicle.chassis.map((item) => item.name)).toEqual(['IS-1', 'IS-2M']);
    expect(vehicle.turrets.map((item) => item.name)).toEqual(['IS-85', 'IS-122']);
    expect(vehicle.engines.map((item) => item.name)).toEqual(['V-2IS', 'V-2-54IS']);

    for (const module of [...vehicle.chassis, ...vehicle.turrets, ...vehicle.engines, ...vehicle.radios]) {
      expect(module.moduleId).toBeGreaterThan(0);
    }
  });

  it('merges vehicle-level gun overrides over the shared gun definition', () => {
    const sharedId = num(get({ value: sharedGuns, path: `shared/${TOP_GUN}/id` }));
    const localReload = num(get({ value: vehicleXml, path: `turrets0/IS-122/guns/${TOP_GUN}/reloadTime` }));
    const sharedReload = num(get({ value: sharedGuns, path: `shared/${TOP_GUN}/reloadTime` }));

    expect(gun?.id).toBe(sharedId);
    expect(localReload).not.toBe(sharedReload);
    expect(gun?.reloadTime).toBe(localReload);
    expect(gun?.weight).toBe(num(get({ value: sharedGuns, path: `shared/${TOP_GUN}/weight` })));
  });

  it('resolves shots against the nation shells and reads pitch limits', () => {
    expect(gun?.shots.map((shot) => shot.kind)).toEqual(['ARMOR_PIERCING', 'ARMOR_PIERCING_CR', 'HIGH_EXPLOSIVE']);
    expect(gun?.shots.every((shot) => shot.piercingPower.at100m >= shot.piercingPower.at500m)).toBe(true);
    expect(gun?.pitchLimits?.elevation).toBe(25);
    expect(gun?.pitchLimits?.depression).toBeGreaterThan(0);
  });

  it('merges engines and radios declared as shared', () => {
    expect(vehicle.engines.every((engine) => engine.power > 0)).toBe(true);
    expect(vehicle.radios.every((radio) => radio.distance > 0)).toBe(true);
    expect(vehicle.fuelTanks[0].weight).toBeGreaterThan(0);
  });

  it('keeps the thickness of spaced mantlet plates and flags them as spaced', () => {
    const guns = vehicle.turrets.flatMap((item) => item.guns);
    const mantlet = guns.find((item) => item.collision === 'Gun_01');

    expect(mantlet?.armor?.armor_1).toBeGreaterThan(0);
    expect(mantlet?.armor?.gun).toBeGreaterThan(0);
    expect(mantlet?.spacedArmor).toEqual(expect.arrayContaining(['armor_1', 'armor_2', 'armor_3']));
    expect(mantlet?.spacedArmor).not.toContain('gun');
  });

  it('keeps a zero-thickness spaced plate in both the armor and the spaced list', () => {
    const mantlet = vehicle.turrets.flatMap((item) => item.guns).find((item) => item.armor?.armor_4 === 0);

    expect(mantlet?.spacedArmor).toContain('armor_4');
  });

  it('reads the collision piece of every module that names one', () => {
    const pieces = vehicle.turrets.flatMap((item) => item.guns.map((entry) => entry.collision));

    expect(pieces).toEqual(expect.arrayContaining(['Gun_01', 'Gun_10']));
  });

  it('leaves plain hull armor without a spaced list', () => {
    expect(vehicle.hull.spacedArmor).toBeUndefined();
    expect(vehicle.chassis[0].armor.leftTrack).toBeGreaterThan(0);
  });
});

describe('parseSpacedArmor / parseCollisionPiece', () => {
  it('flags only plates whose vehicle damage factor is zero', () => {
    const armor = parseXml(
      '<root><armor><armor_1>100</armor_1><armor_14>30<vehicleDamageFactor>0</vehicleDamageFactor></armor_14><armor_15>30<vehicleDamageFactor>1</vehicleDamageFactor></armor_15></armor></root>'
    ).armor;

    expect(parseSpacedArmor(armor)).toEqual(['armor_14']);
  });

  it('turns the client collision model path into a piece name', () => {
    const hitTester = parseXml(
      '<root><hitTester><collisionModelClient>vehicles/russian/R45_IS-7/collision_client/Turret_01.model</collisionModelClient></hitTester></root>'
    ).hitTester;

    expect(parseCollisionPiece(hitTester)).toBe('Turret_01');
    expect(parseCollisionPiece(undefined)).toBeUndefined();
  });
});
