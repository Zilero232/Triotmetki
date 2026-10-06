import { describe, expect, it } from 'vitest';

import { SIXTH_SENSE } from '../../../config';
import { lampLayout } from '../lamp-layout';

const ring = 84;

describe(lampLayout, () => {
  it('keeps the box the same size whether the countdown shows a number or not', () => {
    const counting = lampLayout({ ring, text: false, timer: true });

    expect(counting.box).toEqual({ left: 0, top: 0, width: ring, height: ring + SIXTH_SENSE.seconds.height });
  });

  it('centres the seconds box on the lamp axis with whole-pixel room for two digits', () => {
    const { seconds } = lampLayout({ ring, text: false, timer: true });

    expect(seconds && seconds.left + seconds.width / 2).toBe(ring / 2);
  });

  it('puts the ring at the top left corner of the box', () => {
    expect(lampLayout({ ring, text: false, timer: true }).ring).toEqual({ left: 0, top: 0, width: ring, height: ring });
  });

  it('writes the label between the ring and the seconds', () => {
    const layout = lampLayout({ ring, text: true, timer: true });

    expect([layout.text?.top, layout.seconds?.top]).toEqual([ring + SIXTH_SENSE.text.gap, ring + SIXTH_SENSE.text.gap + SIXTH_SENSE.text.height]);
  });

  it('reserves no seconds row when the timer is off', () => {
    const layout = lampLayout({ ring, text: false, timer: false });

    expect([layout.seconds, layout.box.height]).toEqual([null, ring]);
  });
});
