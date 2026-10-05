import type { Chassis, CrewMember, Engine, FuelTank, Gun, Radio, Shot, Turret, VehicleSpec } from '@otmetki/gamedata';

import type { XmlNode, XmlValue } from '../../xml/xml.types';
import type { ModuleContext, ModuleParseInput, ParseModulesInput, ParseShotsInput, ParseVehicleInput, SharedComponents } from './vehicle.types';

import { nationId } from '../../ids/ids';
import { bool, entries, get, list, node, num, nums, parseXml, text, words } from '../../xml/xml';
import {
  armorExtras,
  parseArmor,
  parseModuleBase,
  parsePitchLimits,
  parseRate,
  parseYawLimits,
  resolveModule,
  resolvePrimaryArmor,
  sharedRecord
} from './vehicle-parts/vehicle-parts';

export const parseSharedComponents = (xml: string): Record<string, XmlNode> => sharedRecord(parseXml(xml));

export const emptyComponents = (): SharedComponents => ({
  chassis: {},
  turrets: {},
  guns: {},
  engines: {},
  fuelTanks: {},
  radios: {}
});

const parseShots = ({ value, context }: ParseShotsInput): Shot[] =>
  entries(value).flatMap(([shellName, shotValue]) => {
    const shot = node(shotValue);

    if (!shot) {
      return [];
    }

    const shell = context.shells[shellName];
    const piercing = nums(shot.piercingPower);

    return [
      {
        shell: shellName,
        shellId: shell?.shellId,
        kind: shell?.kind,
        damage: shell?.damage,
        caliber: shell?.caliber,
        explosionRadius: shell?.explosionRadius,
        isPremium: shell?.isPremium,
        speed: num(shot.speed) ?? 0,
        gravity: num(shot.gravity) ?? 0,
        maxDistance: num(shot.maxDistance) ?? 0,
        piercingPower: { at100m: piercing[0] ?? 0, at500m: piercing[1] ?? piercing[0] ?? 0 },
        defaultPortion: num(shot.defaultPortion)
      }
    ];
  });

const parseGun = ({ name, source, context }: ModuleParseInput): Gun => {
  const factors = node(source.shotDispersionFactors);
  const autoreload = node(source.autoreload);
  const dualGun = node(source.dualGun);
  const clip = parseRate(source.clip);
  const burst = parseRate(source.burst);

  return {
    ...parseModuleBase({ name, source, itemType: 'vehicleGun', nationId: context.nationId }),
    reloadTime: num(source.reloadTime) ?? 0,
    aimingTime: num(source.aimingTime) ?? 0,
    shotDispersionRadius: num(source.shotDispersionRadius) ?? 0,
    shotDispersionFactors: {
      turretRotation: num(factors?.turretRotation) ?? 0,
      afterShot: num(factors?.afterShot) ?? 0,
      whileGunDamaged: num(factors?.whileGunDamaged) ?? 0
    },
    rotationSpeed: num(source.rotationSpeed),
    maxAmmo: num(source.maxAmmo),
    pitchLimits: parsePitchLimits(source.pitchLimits),
    turretYawLimits: parseYawLimits(source.turretYawLimits),
    invisibilityFactorAtShot: num(source.invisibilityFactorAtShot),
    clip: clip && clip.count > 1 ? clip : undefined,
    burst: burst && burst.count > 1 ? burst : undefined,
    autoreload: autoreload
      ? {
          reloadTimes: nums(autoreload.reloadTime),
          boostStartTime: num(autoreload.boostStartTime),
          boostResidueTime: num(autoreload.boostResidueTime),
          boostFraction: num(autoreload.boostFraction)
        }
      : undefined,
    dualGun: dualGun
      ? {
          chargeTime: num(dualGun.chargeTime),
          reloadTimes: nums(dualGun.reloadTimes),
          rateTime: num(dualGun.rateTime),
          reloadLockTime: num(dualGun.reloadLockTime)
        }
      : undefined,
    shots: parseShots({ value: source.shots, context }),
    ...(source.armor === undefined ? {} : { armor: parseArmor(source.armor) }),
    ...armorExtras({ armor: source.armor, hitTester: source.hitTester })
  };
};

const parseTurret = ({ name, source, context }: ModuleParseInput): Turret => {
  const armor = parseArmor(source.armor);

  return {
    ...parseModuleBase({ name, source, itemType: 'vehicleTurret', nationId: context.nationId }),
    rotationSpeed: num(source.rotationSpeed) ?? 0,
    circularVisionRadius: num(source.circularVisionRadius) ?? 0,
    armor,
    primaryArmor: resolvePrimaryArmor({ armor, value: source.primaryArmor }),
    yawLimits: parseYawLimits(source.yawLimits),
    guns: entries(source.guns).map(([gunName, value]) =>
      parseGun({ name: gunName, source: resolveModule({ name: gunName, value, shared: context.components.guns }), context })
    ),
    ...armorExtras({ armor: source.armor, hitTester: source.hitTester })
  };
};

const parseChassis = ({ name, source, context }: ModuleParseInput): Chassis => {
  const resistance = nums(source.terrainResistance);
  const factors = node(source.shotDispersionFactors);

  return {
    ...parseModuleBase({ name, source, itemType: 'vehicleChassis', nationId: context.nationId }),
    rotationSpeed: num(source.rotationSpeed) ?? 0,
    rotationIsAroundCenter: bool(source.rotationIsAroundCenter) ?? false,
    terrainResistance: [resistance[0] ?? 1, resistance[1] ?? 1, resistance[2] ?? 1],
    shotDispersionFactors: {
      movement: num(factors?.vehicleMovement) ?? 0,
      rotation: num(factors?.vehicleRotation) ?? 0
    },
    brakeForce: num(source.brakeForce),
    maxClimbAngle: num(source.maxClimbAngle),
    armor: parseArmor(source.armor),
    repairTime: num(source.repairTime),
    ...armorExtras({ armor: source.armor, hitTester: source.hitTester })
  };
};

const parseCrew = (value: XmlValue | undefined): CrewMember[] =>
  entries(value).flatMap(([role, members]) => list(members).map((member) => ({ role, extraRoles: words(member) })));

const parseModules = <T>({ value, shared, parse }: ParseModulesInput<T>): T[] =>
  entries(value).map(([name, item]) => parse({ name, source: resolveModule({ name, value: item, shared }) }));

const parseOptDevsOverrides = (value: XmlValue | undefined): Record<string, Record<string, number[]>> => {
  const overrides: Record<string, Record<string, number[]>> = {};

  for (const [device, params] of entries(value)) {
    overrides[device] = Object.fromEntries(entries(params).map(([param, amount]) => [param, nums(amount)]));
  }

  return overrides;
};

export const parseVehicle = ({ xml, entry, components, shells }: ParseVehicleInput): VehicleSpec => {
  const root = parseXml(xml);
  const context: ModuleContext = { nationId: nationId(entry.nation), components, shells };
  const hull = node(root.hull) ?? {};
  const hullArmor = parseArmor(hull.armor);
  const invisibility = node(root.invisibility);
  const speedLimits = node(root.speedLimits);

  return {
    ...entry,
    crew: parseCrew(root.crew),
    speedLimits: { forward: num(speedLimits?.forward) ?? 0, backward: num(speedLimits?.backward) ?? 0 },
    invisibility: {
      moving: num(invisibility?.moving) ?? 0,
      still: num(invisibility?.still) ?? 0,
      camouflageBonus: num(invisibility?.camouflageBonus),
      firePenalty: num(invisibility?.firePenalty)
    },
    hull: {
      weight: num(hull.weight) ?? 0,
      maxHealth: num(hull.maxHealth) ?? 0,
      armor: hullArmor,
      primaryArmor: resolvePrimaryArmor({ armor: hullArmor, value: hull.primaryArmor }),
      ammoBayHealth: num(get({ value: hull, path: 'ammoBayHealth/maxHealth' })),
      ...armorExtras({ armor: hull.armor, hitTester: hull.hitTester })
    },
    chassis: parseModules({
      value: root.chassis,
      shared: components.chassis,
      parse: ({ name, source }) => parseChassis({ name, source, context })
    }),
    turrets: parseModules({
      value: root.turrets0,
      shared: components.turrets,
      parse: ({ name, source }) => parseTurret({ name, source, context })
    }),
    engines: parseModules({
      value: root.engines,
      shared: components.engines,
      parse: ({ name, source }): Engine => ({
        ...parseModuleBase({ name, source, itemType: 'vehicleEngine', nationId: context.nationId }),
        power: num(source.power) ?? 0,
        fireStartingChance: num(source.fireStartingChance)
      })
    }),
    fuelTanks: parseModules({
      value: root.fuelTanks,
      shared: components.fuelTanks,
      parse: ({ name, source }): FuelTank => parseModuleBase({ name, source, itemType: 'vehicleFuelTank', nationId: context.nationId })
    }),
    radios: parseModules({
      value: root.radios,
      shared: components.radios,
      parse: ({ name, source }): Radio => ({
        ...parseModuleBase({ name, source, itemType: 'vehicleRadio', nationId: context.nationId }),
        distance: num(source.distance) ?? 0
      })
    }),
    optDevsOverrides: parseOptDevsOverrides(root.optDevsOverrides),
    supplySlots: nums(root.supplySlots),
    postProgressionTree: text(root.postProgressionTree),
    hasSiegeMode: root.siegeMode !== undefined,
    repairCost: num(root.repairCost)
  };
};
