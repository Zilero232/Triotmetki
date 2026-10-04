import { describe, expect, it } from 'vitest';

import type { SixthSenseData } from '../../../model/schemas';

import { lampView } from '../lamp-view';

const lamp = (color: string | null = null): SixthSenseData => ({
  icon: null,
  size: 56,
  text: '',
  color,
  elapsed: 3,
  duration: 10,
  timer: true,
  dim: false
});

describe(lampView, () => {
  it('rings the 56 px lamp in 84 px', () => {
    expect(lampView(lamp()).ring).toBe(84);
  });

  it('drains the ring over the lamp time', () => {
    expect(lampView(lamp()).progress).toBeCloseTo(0.7);
  });

  it('writes the seconds in white without a colour of the player: the ring carries the colour', () => {
    expect(lampView(lamp())).toMatchObject({ seconds: '7', tone: 'text', color: undefined });
  });

  it('paints the seconds in the colour the player set', () => {
    expect(lampView(lamp('#00FF00'))).toMatchObject({ tone: null, color: { color: '#00FF00' } });
  });
});
