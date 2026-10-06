import { describe, expect, it } from 'vitest';

import type { SixthSenseData } from '../../../model/schemas';

import { lampView } from '../lamp-view';

const lamp = (color: string | null = null, elapsed = 3): SixthSenseData => ({
  icon: null,
  size: 56,
  text: '',
  color,
  elapsed,
  duration: 10,
  timer: true,
  dim: false,
  held: false
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

  it('starts the count at the whole lamp time', () => {
    expect(lampView(lamp(null, 0)).seconds).toBe('10');
  });

  it('reads 1 in the last second, never 0', () => {
    expect(lampView(lamp(null, 9.6)).seconds).toBe('1');
  });

  it('writes no 0 once the time is out: the lamp goes out then', () => {
    expect(lampView(lamp(null, 10))).toMatchObject({ seconds: '', progress: 0, lit: false });
  });

  it('stays lit without seconds while the player is still spotted after the time', () => {
    expect(lampView({ ...lamp(null, 10), held: true })).toMatchObject({ seconds: '', progress: 0, lit: true });
  });

  it('paints the seconds in the colour the player set', () => {
    expect(lampView(lamp('#00FF00'))).toMatchObject({ tone: null, color: { color: '#00FF00' } });
  });
});
