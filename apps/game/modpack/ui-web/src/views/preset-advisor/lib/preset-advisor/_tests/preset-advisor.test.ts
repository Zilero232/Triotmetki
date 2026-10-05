// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { applyMarks } from '../preset-advisor';

const payload = (items: number[]): string => JSON.stringify({ v: 1, tankId: 7, items, label: 'Site build' });

const setupModel = (items: number[]) => ({
  otmetkiPresetAdvisor: { payload: payload(items) },
  tankSetup: {
    optDevicesSetup: {
      slots: [
        { intCD: 11, imageName: 'rammer' },
        { intCD: 12, imageName: 'improvedVentilation' }
      ]
    }
  }
});

const cards = `
  <div class="OptDeviceSlot"><div style="background-image: url('img://gui/maps/shop/artefacts/180x135/rammer.png')"></div></div>
  <div class="OptDeviceSlot"><div style="background-image: url('img://gui/maps/shop/artefacts/180x135/improvedVentilation.png')"></div></div>
`;

afterEach(() => {
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'model');
});

describe('applyMarks', () => {
  it('marks the cards of the intCD the payload advises', () => {
    document.body.innerHTML = cards;
    Reflect.set(window, 'model', setupModel([11]));

    expect(applyMarks(window)).toBe(1);
    expect(document.querySelector('[data-otmetki-advised] div')?.getAttribute('style')).toContain('/rammer.png');
  });

  it('marks nothing without the payload model', () => {
    document.body.innerHTML = cards;
    Reflect.set(window, 'model', { tankSetup: {} });

    expect(applyMarks(window)).toBe(0);
  });
});
