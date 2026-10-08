import { describe, expect, it } from 'vitest';

import { modulesPick } from '..';

const MODULES = {
  turrets: [
    { cd: 11, label: 'A', active: false },
    { cd: 12, label: 'B', active: true }
  ],
  guns: [
    { cd: 101, label: 'C', active: true },
    { cd: 102, label: 'D', active: false }
  ]
};

describe(modulesPick, () => {
  it('keeps the shown gun when another turret is picked', () => {
    expect(modulesPick({ modules: MODULES, turret: 11 })).toEqual({ turret: 11, gun: 101 });
  });

  it('keeps the shown turret when another gun is picked', () => {
    expect(modulesPick({ modules: MODULES, gun: 102 })).toEqual({ turret: 12, gun: 102 });
  });

  it('sends no module id when nothing is shown', () => {
    expect(modulesPick({ modules: { turrets: [], guns: [] }, gun: 102 }).turret).toBe(0);
  });
});
