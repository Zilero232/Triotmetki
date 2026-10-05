import { describe, expect, it } from 'vitest';

import { COMMON_FIXTURES, loadIs, readFixture } from '../../../_tests/fixtures';
import { provisionIdOf } from '../../../ids/ids';
import { matchesVehicleFilter } from '../../vehicle-filter/vehicle-filter';
import { parseOptionalDevices } from '../optional-devices';

const devices = parseOptionalDevices(readFixture(COMMON_FIXTURES.optionalDevices));
const byName = new Map(devices.map((device) => [device.name, device]));

describe('parseOptionalDevices', () => {
  it('assigns provision ids from the equipment compact descriptor', () => {
    for (const device of devices) {
      expect(device.provisionId).toBe(provisionIdOf({ itemType: 'optionalDevice', id: device.id }));
    }
  });

  it('reads static factors with normal and specialization values', () => {
    const rammer = byName.get('tankRammer_tier1');
    const reload = rammer?.modifiers.find((modifier) => modifier.attribute === 'miscAttrs/gunReloadTimeFactor');

    expect(reload?.op).toBe('mul');
    expect(reload?.value).toBeLessThan(1);
    expect(reload?.specValue).toBeLessThan(reload?.value ?? 0);
    expect(rammer?.categories).toEqual(['firepower']);
  });

  it('classifies deluxe, trophy and modernized devices', () => {
    expect(byName.get('deluxRammer')?.kind).toBe('deluxe');
    expect(byName.get('trophyUpgradedTankRammer')?.kind).toBe('trophy');
    expect(byName.get('modernizedAimDrivesAimingStabilizer2')?.kind).toBe('modernized');
    expect(byName.get('tankRammer_tier1')?.kind).toBe('standard');
  });

  it('turns script parameters of special devices into conditional modifiers', () => {
    const stereoscope = byName.get('stereoscope_tier1')?.modifiers;
    const camouflageNet = byName.get('camouflageNet_tier2')?.modifiers;
    const rotation = byName.get('improvedRotationMechanism_tier1')?.modifiers ?? [];

    expect(stereoscope).toEqual([expect.objectContaining({ attribute: 'circularVisionRadius', op: 'mul', condition: 'still' })]);
    expect(camouflageNet).toEqual([expect.objectContaining({ attribute: 'invisibility/additive', op: 'add', condition: 'still' })]);

    expect(rotation.filter((modifier) => modifier.condition === 'tracked').map((modifier) => modifier.attribute)).toEqual([
      'miscAttrs/onMoveRotationSpeedFactor',
      'miscAttrs/onStillRotationSpeedFactor'
    ]);

    expect(rotation.some((modifier) => modifier.attribute === 'miscAttrs/turretRotationSpeed' && modifier.condition === undefined)).toBe(true);
  });

  it('reads vehicle filters that match by level and by user tags', () => {
    const is = loadIs();

    expect(matchesVehicleFilter({ filter: byName.get('tankRammer_tier1')!.vehicleFilter, vehicle: is })).toBe(false);
    expect(matchesVehicleFilter({ filter: byName.get('trophyUpgradedTankRammer')!.vehicleFilter, vehicle: is })).toBe(true);
    expect(matchesVehicleFilter({ filter: byName.get('turbocharger_tier1')!.vehicleFilter, vehicle: is })).toBe(false);
    expect(byName.get('modernizedAimDrivesAimingStabilizer2')?.upgradedDevice).toBe('modernizedAimDrivesAimingStabilizer3');
  });
});
