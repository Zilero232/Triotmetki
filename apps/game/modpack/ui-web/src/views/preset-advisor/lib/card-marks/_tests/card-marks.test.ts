// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { markCards } from '../card-marks';

const card = (image: string): string =>
  `<div class="OptDeviceSlot_base"><div class="Icon_image" style="background-image: url('img://gui/maps/shop/artefacts/180x135/${image}.png')"></div></div>`;

const render = (html: string): HTMLElement => {
  const root = document.createElement('div');

  root.innerHTML = html;
  document.body.appendChild(root);

  return root;
};

const markedImages = (root: Element): string[] =>
  Array.from(root.querySelectorAll('[data-otmetki-advised]')).map((element) => element.querySelector('.Icon_image')?.getAttribute('style') ?? '');

afterEach(() => {
  document.body.innerHTML = '';
});

describe('markCards', () => {
  it('marks the card around each advised image once, with the badge', () => {
    const root = render(card('rammer') + card('improvedVentilation') + card('rammerBattleBooster'));

    expect(markCards({ root, images: ['rammer'], label: 'Site build' })).toBe(1);
    expect(markCards({ root, images: ['rammer'], label: 'Site build' })).toBe(1);

    expect(markedImages(root)).toHaveLength(1);
    expect(markedImages(root)[0]).toContain('/rammer.png');
    expect(root.querySelectorAll('.otmetki-advised-badge')).toHaveLength(1);
    expect(root.querySelector('.otmetki-advised-badge')?.textContent).toBe('Site build');
  });

  it('takes the marks off the cards that are no longer advised', () => {
    const root = render(card('rammer') + card('improvedVentilation'));

    markCards({ root, images: ['rammer', 'improvedVentilation'], label: 'Site build' });
    markCards({ root, images: ['improvedVentilation'], label: 'Site build' });

    expect(markedImages(root)).toHaveLength(1);
    expect(markedImages(root)[0]).toContain('/improvedVentilation.png');
    expect(root.querySelectorAll('.otmetki-advised-badge')).toHaveLength(1);

    markCards({ root, images: [], label: 'Site build' });

    expect(markedImages(root)).toHaveLength(0);
    expect(root.querySelector('.OptDeviceSlot_base')?.getAttribute('style')).toBeFalsy();
  });

  it('finds an image element too and leaves the badge out without a label', () => {
    const root = render('<div class="BoosterCard"><img src="img://gui/maps/icons/boosters/booster_repair.png"></div>');

    expect(markCards({ root, images: ['booster_repair'], label: '' })).toBe(1);
    expect(root.querySelector('.BoosterCard')?.hasAttribute('data-otmetki-advised')).toBe(true);
    expect(root.querySelector('.otmetki-advised-badge')).toBeNull();
  });

  it('marks and unmarks cards on an engine whose elements have no hasAttribute', () => {
    const root = render(card('rammer'));
    const original = Element.prototype.hasAttribute;

    Reflect.deleteProperty(Element.prototype, 'hasAttribute');

    try {
      expect(markCards({ root, images: ['rammer'], label: 'Site build' })).toBe(1);
      expect(markCards({ root, images: [], label: 'Site build' })).toBe(0);
    } finally {
      Element.prototype.hasAttribute = original;
    }

    expect(markedImages(root)).toHaveLength(0);
    expect(root.querySelector('.OptDeviceSlot_base')?.getAttribute('style')).toBeFalsy();
  });
});
