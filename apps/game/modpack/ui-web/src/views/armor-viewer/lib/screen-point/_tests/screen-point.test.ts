import { describe, expect, it } from 'vitest';

import { cardPlace, isSameFraction, screenFraction, screenLayer } from '..';

const RECT = { left: -100, top: 0, width: 2000, height: 1000 };

describe(screenFraction, () => {
  it('measures a point from the corner of the screen layer', () => {
    expect(screenFraction({ point: { x: 900, y: 250 }, rect: RECT })).toEqual({ x: 0.5, y: 0.25 });
  });

  it('rounds to the digits the hover ray needs', () => {
    expect(screenFraction({ point: { x: 1, y: 1 }, rect: { left: 0, top: 0, width: 3, height: 3 } })).toEqual({ x: 0.3333, y: 0.3333 });
  });

  it('gives nothing outside the screen', () => {
    expect(screenFraction({ point: { x: 2000, y: 250 }, rect: RECT })).toBeNull();
  });

  it('gives nothing before the layer has a size', () => {
    expect(screenFraction({ point: { x: 10, y: 10 }, rect: { left: 0, top: 0, width: 0, height: 0 } })).toBeNull();
  });
});

describe(screenLayer, () => {
  it('moves the layer back to the screen corner when the view starts inside the screen', () => {
    expect(screenLayer({ x: 10, y: 40, width: 1900, height: 1040 })).toEqual({ left: '-10rem', top: '-40rem' });
  });

  it('keeps the layer at the view corner without a view rectangle', () => {
    expect(screenLayer(null)).toEqual({ left: '0rem', top: '0rem' });
  });
});

describe(cardPlace, () => {
  const viewport = { width: 1000, height: 800 };

  it('puts the card below and right of the cursor', () => {
    expect(cardPlace({ point: { x: 100, y: 100 }, viewport })).toEqual({ left: '118px', top: '118px', transform: 'translate(0, 0)' });
  });

  it('turns the card to the left near the right edge', () => {
    expect(cardPlace({ point: { x: 900, y: 100 }, viewport }).transform).toBe('translate(-100%, 0)');
  });

  it('lifts the card above the cursor near the bottom', () => {
    expect(cardPlace({ point: { x: 100, y: 700 }, viewport }).top).toBe('682px');
  });
});

describe(isSameFraction, () => {
  it('knows a point it already sent', () => {
    expect(isSameFraction({ first: { x: 0.5, y: 0.5 }, second: { x: 0.5, y: 0.5 } })).toBe(true);
  });

  it('sends the first point', () => {
    expect(isSameFraction({ first: null, second: { x: 0.5, y: 0.5 } })).toBe(false);
  });
});
