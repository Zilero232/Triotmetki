import { describe, expect, it } from 'vitest';

import { loadIs } from '../../../../gamedata/lib/_tests/fixtures';
import { TANK_MATH } from '../../../config/tank-math.constants';
import { toTankMathConfig } from '../tank-math-config';

describe('toTankMathConfig', () => {
  const vehicle = loadIs();
  const stock = toTankMathConfig({ vehicle, preset: 'stock' });
  const top = toTankMathConfig({ vehicle, preset: 'top' });

  it('takes the camouflage of the hull and the gun factor at shot', () => {
    expect(top.camouflage.still).toBe(vehicle.invisibility.still);
    expect(top.camouflage.moving).toBeLessThanOrEqual(top.camouflage.still);
    expect(top.camouflage.atShot).toBeGreaterThan(0);
    expect(top.camouflage.atShot).toBeLessThanOrEqual(TANK_MATH.neutralAtShot);
  });

  it('lists every shell of the gun with its ballistics', () => {
    expect(top.shells.length).toBeGreaterThan(0);

    for (const shell of top.shells) {
      expect(shell.speed).toBeGreaterThan(0);
      expect(shell.maxDistance).toBeGreaterThan(0);
      expect(shell.penetration100m).toBeGreaterThanOrEqual(shell.penetration500m);
    }
  });

  it('never makes the top configuration see or penetrate worse than the stock one', () => {
    const best = (shells: typeof top.shells): number => Math.max(...shells.map((shell) => shell.penetration100m));

    expect(top.vision.viewRange).toBeGreaterThanOrEqual(stock.vision.viewRange);
    expect(best(top.shells)).toBeGreaterThanOrEqual(best(stock.shells));
  });
});
