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

const advised = () => render(card('rammer') + card('improvedVentilation') + card('rammerBattleBooster'));

const markedOnce = (): HTMLElement => {
  const root = advised();

  markCards({ root, images: ['rammer'], label: 'Site build' });

  return root;
};

const narrowed = (): HTMLElement => {
  const root = render(card('rammer') + card('improvedVentilation'));

  markCards({ root, images: ['rammer', 'improvedVentilation'], label: 'Site build' });
  markCards({ root, images: ['improvedVentilation'], label: 'Site build' });

  return root;
};

const cleared = (): HTMLElement => {
  const root = narrowed();

  markCards({ root, images: [], label: 'Site build' });

  return root;
};

const imageCard = (): HTMLElement => render('<div class="BoosterCard"><img src="img://gui/maps/icons/boosters/booster_repair.png"></div>');

const withoutHasAttribute = <Result>(run: () => Result): Result => {
  const original = Element.prototype.hasAttribute;

  Reflect.deleteProperty(Element.prototype, 'hasAttribute');

  try {
    return run();
  } finally {
    Element.prototype.hasAttribute = original;
  }
};

describe('markCards', () => {
  it('counts the cards around the advised images', () => {
    expect(markCards({ root: advised(), images: ['rammer'], label: 'Site build' })).toBe(1);
  });

  it('counts a card marked before only once', () => {
    const root = markedOnce();

    expect(markCards({ root, images: ['rammer'], label: 'Site build' })).toBe(1);
  });

  it('marks only the card of the advised image', () => {
    expect(markedImages(markedOnce())).toEqual([expect.stringContaining('/rammer.png')]);
  });

  it('puts the badge with the label on the marked card', () => {
    const badges = Array.from(markedOnce().querySelectorAll('.otmetki-advised-badge')).map((badge) => badge.textContent);

    expect(badges).toEqual(['Site build']);
  });

  it('takes the marks off the cards that are no longer advised', () => {
    expect(markedImages(narrowed())).toEqual([expect.stringContaining('/improvedVentilation.png')]);
  });

  it('takes the badge off the cards that are no longer advised', () => {
    expect(narrowed().querySelectorAll('.otmetki-advised-badge')).toHaveLength(1);
  });

  it('takes every mark off once nothing is advised', () => {
    expect(markedImages(cleared())).toHaveLength(0);
  });

  it('gives the card its own position back once nothing is advised', () => {
    expect(cleared().querySelector('.OptDeviceSlot_base')?.getAttribute('style')).toBeFalsy();
  });

  it('finds an image element too', () => {
    expect(markCards({ root: imageCard(), images: ['booster_repair'], label: '' })).toBe(1);
  });

  it('marks the card of an image element', () => {
    const root = imageCard();

    markCards({ root, images: ['booster_repair'], label: '' });

    expect(root.querySelector('.BoosterCard')?.hasAttribute('data-otmetki-advised')).toBe(true);
  });

  it('leaves the badge out without a label', () => {
    const root = imageCard();

    markCards({ root, images: ['booster_repair'], label: '' });

    expect(root.querySelector('.otmetki-advised-badge')).toBeNull();
  });

  it('marks cards on an engine whose elements have no hasAttribute', () => {
    const root = render(card('rammer'));

    expect(withoutHasAttribute(() => markCards({ root, images: ['rammer'], label: 'Site build' }))).toBe(1);
  });

  it('unmarks cards on an engine whose elements have no hasAttribute', () => {
    const root = render(card('rammer'));

    withoutHasAttribute(() => markCards({ root, images: ['rammer'], label: 'Site build' }));
    withoutHasAttribute(() => markCards({ root, images: [], label: 'Site build' }));

    expect(markedImages(root)).toHaveLength(0);
  });

  it('gives the card its position back on an engine whose elements have no hasAttribute', () => {
    const root = render(card('rammer'));

    withoutHasAttribute(() => markCards({ root, images: ['rammer'], label: 'Site build' }));
    withoutHasAttribute(() => markCards({ root, images: [], label: 'Site build' }));

    expect(root.querySelector('.OptDeviceSlot_base')?.getAttribute('style')).toBeFalsy();
  });
});
