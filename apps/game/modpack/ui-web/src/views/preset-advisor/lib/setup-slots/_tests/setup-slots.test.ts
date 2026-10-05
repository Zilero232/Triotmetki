import { describe, expect, it } from 'vitest';

import { advisedImages } from '../setup-slots';

const slot = (intCD: number, imageName: string) => ({ value: { intCD, imageName } });

const model = {
  tankSetup: {
    optDevicesSetup: { slots: { length: 3, 0: slot(11, 'improvedVentilation'), 1: slot(12, 'rammer'), 2: slot(13, 'aimingStabilizer') } },
    battleBoostersSetup: {
      slots: [
        { intCD: 21, imageName: 'booster_repair' },
        { intCD: 22, imageName: '' }
      ]
    }
  }
};

describe('advisedImages', () => {
  it('turns the advised intCD into the image names of the stock cards', () => {
    expect(advisedImages({ model, items: [12, 21, 22, 99] })).toEqual(['rammer', 'booster_repair']);
  });

  it('marks nothing without items or without the stock setup', () => {
    expect(advisedImages({ model, items: [] })).toEqual([]);
    expect(advisedImages({ model: {}, items: [12] })).toEqual([]);
  });
});
