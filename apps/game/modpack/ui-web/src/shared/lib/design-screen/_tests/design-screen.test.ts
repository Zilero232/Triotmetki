import { describe, expect, it } from 'vitest';

import { designScreen, parseScale } from '../design-screen';

const FALLBACK = { width: 1920, height: 1080 };

describe(parseScale, () => {
  it.each([
    ['1.25px', 1.25],
    ['2px', 2]
  ])('reads the Gameface root font size %s as the interface scale', (fontSize, scale) => {
    expect(parseScale(fontSize)).toBe(scale);
  });

  it.each(['', '0px', '16px'])('falls back to 1 for %j, which is not an interface scale', (fontSize) => {
    expect(parseScale(fontSize)).toBe(1);
  });
});

describe(designScreen, () => {
  it('divides the client pixels by the interface scale', () => {
    const screen = designScreen({ client: { width: 3840, height: 2160 }, scale: 2, fallback: FALLBACK });

    expect(screen).toEqual({ width: 1920, height: 1080 });
  });

  it('keeps the client pixels at scale 1', () => {
    const screen = designScreen({ client: { width: 1366, height: 768 }, scale: 1, fallback: FALLBACK });

    expect(screen).toEqual({ width: 1366, height: 768 });
  });

  it.each([
    ['no client size', null],
    ['an empty client size', { width: 0, height: 0 }]
  ])('uses the fallback for %s', (_case, client) => {
    expect(designScreen({ client, scale: 1, fallback: FALLBACK })).toBe(FALLBACK);
  });
});
