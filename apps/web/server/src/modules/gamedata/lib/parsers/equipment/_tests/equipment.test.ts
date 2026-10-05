import { describe, expect, it } from 'vitest';

import { COMMON_FIXTURES, readFixture } from '../../../_tests/fixtures';
import { provisionIdOf } from '../../../ids/ids';
import { parseEquipments } from '../equipment';

const items = parseEquipments(readFixture(COMMON_FIXTURES.equipments));
const byName = new Map(items.map((item) => [item.name, item]));

describe('parseEquipments', () => {
  it('classifies consumables, directives and mode abilities', () => {
    expect(byName.get('largeRepairkit')?.kind).toBe('consumable');
    expect(byName.get('rammerBattleBooster')?.kind).toBe('directive');
    expect(byName.get('artillery_epic')?.kind).toBe('ability');

    for (const item of items) {
      expect(item.provisionId).toBe(provisionIdOf({ itemType: 'equipment', id: item.id }));
    }
  });

  it('models fuel, food and rpm limiter as vehicle factors', () => {
    const gasoline = byName.get('gasoline100');
    const power = gasoline?.params.enginePowerFactor;

    expect(gasoline?.modifiers).toEqual([
      { attribute: 'engine/power', op: 'mul', value: power },
      { attribute: 'turret/rotationSpeed', op: 'mul', value: gasoline?.params.turretRotationSpeedFactor }
    ]);

    expect(byName.get('ration')?.modifiers).toEqual([
      { attribute: 'crewLevelIncrease', op: 'add', value: byName.get('ration')?.params.crewLevelIncrease }
    ]);

    expect(byName.get('removedRpmLimiter')?.modifiers[0]).toMatchObject({ attribute: 'engine/power', condition: 'active' });
    expect(byName.get('autoExtinguishers')?.modifiers[0].attribute).toBe('engine/fireStartingChance');
    expect(byName.get('largeRepairkit')?.modifiers[0]).toMatchObject({ attribute: 'repairSpeed', op: 'mul' });
  });

  it('keeps the device requirement of equipment directives', () => {
    const rammer = byName.get('rammerBattleBooster')?.modifiers ?? [];

    expect(rammer.length).toBeGreaterThan(0);
    expect(rammer.every((modifier) => modifier.attribute === 'gun/reloadTime' && modifier.requiresDevice?.required.includes('rammer'))).toBe(true);
    expect(byName.get('improvedVentilationBattleBooster')?.modifiers.every((modifier) => modifier.op === 'add')).toBe(true);

    expect(byName.get('additInvisibilityDeviceBattleBooster')?.modifiers.map((modifier) => modifier.attribute)).toEqual([
      'invisibility/additive',
      'invisibility/mult'
    ]);
  });

  it('reads crew skill directives and economic directives', () => {
    expect(byName.get('virtuosoBattleBooster')?.skillBoost).toMatchObject({ skill: 'driver_virtuoso' });

    expect(byName.get('creditsDirectivesBattleBooster1')?.modifiers).toEqual([expect.objectContaining({ attribute: 'economy/Credits', op: 'mul' })]);

    expect(byName.get('creditsDirectivesBattleBooster1')?.modifiers[0].value).toBeGreaterThan(1);
  });
});
